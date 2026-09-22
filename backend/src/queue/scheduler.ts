import cron from "node-cron";
import { prisma } from "../db/prisma";

// Mapa en memoria de tareas cron activas por event_type. Vive en el
// proceso del API (que es donde se registran/editan event_types), no en
// el worker de entrega — disparar un evento programado solo crea filas
// PENDING, la entrega la sigue haciendo el worker de forma separada.
const tasks = new Map<string, cron.ScheduledTask>();

export function registerSchedule(eventTypeId: string, tenantId: string, triggerKey: string, expression: string) {
  unregisterSchedule(eventTypeId);
  if (!cron.validate(expression)) {
    console.error(`[scheduler] expresion cron invalida para event_type ${eventTypeId}: "${expression}"`);
    return;
  }

  const task = cron.schedule(expression, async () => {
    // Se importa aqui adentro (no arriba) para evitar un ciclo de
    // imports entre scheduler <-> events.service.
    const { triggerEvent } = await import("../modules/events/events.service");

    // Clave de idempotencia derivada del minuto exacto del tick: si el
    // proceso se reinicia o hay mas de una instancia del scheduler
    // corriendo, el UNIQUE(tenant_id, idempotency_key) de "events"
    // absorbe el duplicado sin generar un segundo fan-out.
    const bucket = new Date();
    bucket.setSeconds(0, 0);
    const idempotencyKey = `scheduled:${eventTypeId}:${bucket.toISOString()}`;

    try {
      await triggerEvent(tenantId, {
        triggerKey,
        idempotencyKey,
        payload: {},
        source: "SCHEDULED",
      });
    } catch (err) {
      console.error(`[scheduler] error disparando "${triggerKey}" (${eventTypeId}):`, err);
    }
  });

  tasks.set(eventTypeId, task);
}

export function unregisterSchedule(eventTypeId: string) {
  tasks.get(eventTypeId)?.stop();
  tasks.delete(eventTypeId);
}

export async function initScheduler() {
  const scheduled = await prisma.eventType.findMany({
    where: { isActive: true, schedule: { not: null } },
  });
  for (const eventType of scheduled) {
    if (eventType.schedule) {
      registerSchedule(eventType.id, eventType.tenantId, eventType.triggerKey, eventType.schedule);
    }
  }
  console.log(`[scheduler] ${scheduled.length} tipo(s) de evento programado(s) registrado(s)`);
}
