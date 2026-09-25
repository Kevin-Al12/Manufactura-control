import { Channel, NotificationStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getChannel } from "./channels";

const BATCH_SIZE = 20;
const MAX_BACKOFF_MS = 30 * 60_000; // 30 min
// Un envio normal tarda segundos; 5 min en QUEUED significa que el worker que lo tomo ya no existe.
const STALE_QUEUED_MS = 5 * 60_000;
const REAPER_INTERVAL_MS = 60_000;

interface ClaimedRow {
  id: string;
  tenant_id: string;
  recipient_email: string;
  rendered_message: string;
  channel: Channel;
  attempts: number;
  max_attempts: number;
}

/**
 * Reclama en un solo statement atomico un lote de notificaciones
 * pendientes y las marca QUEUED. FOR UPDATE SKIP LOCKED evita que, si en
 * algun momento se corre mas de una instancia del worker, dos instancias
 * tomen la misma fila.
 */
async function claimBatch(): Promise<ClaimedRow[]> {
  return prisma.$queryRaw<ClaimedRow[]>`
    UPDATE notifications
    SET status = 'QUEUED', queued_at = now(), updated_at = now()
    WHERE id IN (
      SELECT id FROM notifications
      WHERE status = 'PENDING' AND next_attempt_at <= now()
      ORDER BY next_attempt_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, tenant_id, recipient_email, rendered_message, channel, attempts, max_attempts
  `;
}

async function processNotification(row: ClaimedRow): Promise<void> {
  const channel = getChannel(row.channel);

  try {
    await channel.send({ to: row.recipient_email, message: row.rendered_message });

    await prisma.$transaction([
      prisma.notification.update({
        where: { id: row.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date(), attempts: { increment: 1 } },
      }),
      prisma.notificationLog.create({
        data: {
          tenantId: row.tenant_id,
          notificationId: row.id,
          status: NotificationStatus.SENT,
          message: "Entregada correctamente",
        },
      }),
    ]);
  } catch (err) {
    const attempts = row.attempts + 1;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const exhausted = attempts >= row.max_attempts;

    await prisma.$transaction([
      prisma.notification.update({
        where: { id: row.id },
        data: exhausted
          ? { status: NotificationStatus.FAILED, failedAt: new Date(), attempts, lastError: errorMessage }
          : {
              status: NotificationStatus.PENDING,
              attempts,
              lastError: errorMessage,
              nextAttemptAt: new Date(Date.now() + backoffFor(attempts)),
            },
      }),
      prisma.notificationLog.create({
        data: {
          tenantId: row.tenant_id,
          notificationId: row.id,
          status: NotificationStatus.FAILED,
          message: exhausted
            ? `Intento ${attempts}/${row.max_attempts} fallido: ${errorMessage}. Sin mas reintentos.`
            : `Intento ${attempts}/${row.max_attempts} fallido: ${errorMessage}. Reintentando.`,
        },
      }),
    ]);
  }
}

/**
 * Devuelve a PENDING las notificaciones que quedaron en QUEUED demasiado
 * tiempo: el worker que las tomo murio (deploy, crash) antes de marcarlas
 * SENT/FAILED. Sin esto quedarian atascadas para siempre. La entrega pasa
 * a ser "al menos una vez": en el peor caso un correo puede salir dos veces,
 * pero nunca se pierde.
 */
export async function requeueStale(): Promise<number> {
  const rows = await prisma.$queryRaw<{ id: string; tenant_id: string }[]>`
    UPDATE notifications
    SET status = 'PENDING', next_attempt_at = now(), updated_at = now()
    WHERE status = 'QUEUED' AND queued_at < now() - (${STALE_QUEUED_MS}::text || ' milliseconds')::interval
    RETURNING id, tenant_id
  `;
  if (rows.length === 0) return 0;

  await prisma.notificationLog.createMany({
    data: rows.map((row) => ({
      tenantId: row.tenant_id,
      notificationId: row.id,
      status: NotificationStatus.PENDING,
      message: "Quedo en QUEUED sin resolverse (worker interrumpido); se vuelve a encolar",
    })),
  });
  console.warn(`[worker] ${rows.length} notificacion(es) atascada(s) en QUEUED devuelta(s) a PENDING`);
  return rows.length;
}

function backoffFor(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, 2 ** attempts * 30_000);
}

async function pollOnce(): Promise<void> {
  const claimed = await claimBatch();
  if (claimed.length === 0) return;

  console.log(`[worker] procesando lote de ${claimed.length} notificacion(es)`);
  await Promise.all(claimed.map(processNotification));
}

export function startWorker() {
  console.log(`[worker] iniciado, polling cada ${env.workerPollIntervalMs}ms`);
  // Evita que dos ciclos se solapen si un lote tarda mas que el intervalo.
  let polling = false;
  const timer = setInterval(() => {
    if (polling) return;
    polling = true;
    pollOnce()
      .catch((err) => console.error("[worker] error en el ciclo de polling:", err))
      .finally(() => {
        polling = false;
      });
  }, env.workerPollIntervalMs);

  const reaper = setInterval(() => {
    requeueStale().catch((err) => console.error("[worker] error recuperando notificaciones atascadas:", err));
  }, REAPER_INTERVAL_MS);

  return () => {
    clearInterval(timer);
    clearInterval(reaper);
  };
}

// Permite correr el worker como proceso independiente (`npm run worker`).
if (require.main === module) {
  startWorker();
}
