import { Channel, NotificationStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { getChannel } from "./channels";

const BATCH_SIZE = 20;
const MAX_BACKOFF_MS = 30 * 60_000; // 30 min

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

    await prisma.notification.update({
      where: { id: row.id },
      data: { status: NotificationStatus.SENT, sentAt: new Date(), attempts: { increment: 1 } },
    });
    await prisma.notificationLog.create({
      data: {
        tenantId: row.tenant_id,
        notificationId: row.id,
        status: NotificationStatus.SENT,
        message: "Entregada correctamente",
      },
    });
  } catch (err) {
    const attempts = row.attempts + 1;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const exhausted = attempts >= row.max_attempts;

    await prisma.notification.update({
      where: { id: row.id },
      data: exhausted
        ? { status: NotificationStatus.FAILED, failedAt: new Date(), attempts, lastError: errorMessage }
        : {
            status: NotificationStatus.PENDING,
            attempts,
            lastError: errorMessage,
            nextAttemptAt: new Date(Date.now() + backoffFor(attempts)),
          },
    });

    await prisma.notificationLog.create({
      data: {
        tenantId: row.tenant_id,
        notificationId: row.id,
        status: NotificationStatus.FAILED,
        message: exhausted
          ? `Intento ${attempts}/${row.max_attempts} fallido: ${errorMessage}. Sin mas reintentos.`
          : `Intento ${attempts}/${row.max_attempts} fallido: ${errorMessage}. Reintentando.`,
      },
    });
  }
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
  const timer = setInterval(() => {
    pollOnce().catch((err) => console.error("[worker] error en el ciclo de polling:", err));
  }, env.workerPollIntervalMs);
  return () => clearInterval(timer);
}

// Permite correr el worker como proceso independiente (`npm run worker`).
if (require.main === module) {
  startWorker();
}
