import { randomUUID } from "node:crypto";
import { Prisma, EventSource, NotificationStatus, Role } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { renderTemplate } from "../../utils/template";
import type { RecipientRule } from "../eventTypes/recipientRule";

export interface TriggerEventInput {
  triggerKey: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  source?: EventSource;
}

export interface TriggerEventResult {
  eventId: string;
  duplicate: boolean;
  notificationsCreated: number;
}

/**
 * Punto de entrada unico para disparar un evento (API, webhook o
 * scheduler). Garantiza:
 *   1. Aislamiento por tenant (todo se resuelve contra tenantId).
 *   2. Cero duplicados: si idempotencyKey ya se uso para este tenant, no
 *      se genera un segundo fan-out, sin importar cuantas veces se llame.
 *   3. No bloquea al llamador con el envio real: solo deja filas
 *      "notifications" en PENDING. El worker (src/queue/worker.ts) es
 *      quien entrega de forma asincrona.
 */
export async function triggerEvent(tenantId: string, input: TriggerEventInput): Promise<TriggerEventResult> {
  const eventType = await prisma.eventType.findUnique({
    where: { tenantId_triggerKey: { tenantId, triggerKey: input.triggerKey } },
  });
  if (!eventType || !eventType.isActive) {
    throw new HttpError(404, `Tipo de evento "${input.triggerKey}" no encontrado o inactivo`);
  }

  const payload = input.payload ?? {};
  const recipients = await resolveRecipients(tenantId, eventType.recipientRule as unknown as RecipientRule);

  // El Event y todo su fan-out se crean en UNA transaccion: o queda todo o
  // no queda nada. Si el Event se guardara aparte y el fan-out fallara, el
  // reintento del cliente se veria como "duplicado" y nadie seria
  // notificado nunca.
  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId,
          eventTypeId: eventType.id,
          idempotencyKey: input.idempotencyKey,
          source: input.source ?? EventSource.API,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      const rows = recipients.map((recipient) => ({
        id: randomUUID(),
        tenantId,
        eventId: event.id,
        eventTypeId: eventType.id,
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        channel: eventType.channel,
        renderedMessage: renderTemplate(eventType.messageTemplate, {
          ...payload,
          nombre: recipient.name,
          area: recipient.area ?? "",
          turno: recipient.shift ?? "",
          email: recipient.email,
        }),
        status: NotificationStatus.PENDING,
      }));

      if (rows.length > 0) {
        await tx.notification.createMany({ data: rows });
        await tx.notificationLog.createMany({
          data: rows.map((row) => ({
            tenantId,
            notificationId: row.id,
            status: NotificationStatus.PENDING,
            message: "Notificacion creada, en espera de ser encolada",
          })),
        });
      }

      return { eventId: event.id, duplicate: false, notificationsCreated: rows.length };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Ya existe un Event con este (tenantId, idempotencyKey): el mismo
      // evento fue disparado (y repartido) antes. No se vuelve a hacer fan-out.
      const existing = await prisma.event.findUniqueOrThrow({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
      });
      return { eventId: existing.id, duplicate: true, notificationsCreated: 0 };
    }
    throw err;
  }
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  area: string | null;
  shift: string | null;
}

async function resolveRecipients(tenantId: string, rule: RecipientRule): Promise<Recipient[]> {
  const select = { id: true, name: true, email: true, area: true, shift: true } as const;

  switch (rule.type) {
    case "ROLE":
      return prisma.user.findMany({
        where: { tenantId, isActive: true, role: rule.value as Role },
        select,
      });
    case "AREA":
      return prisma.user.findMany({
        where: { tenantId, isActive: true, area: rule.value },
        select,
      });
    case "USERS":
      return prisma.user.findMany({
        where: { tenantId, isActive: true, id: { in: rule.value } },
        select,
      });
    case "ALL":
      return prisma.user.findMany({ where: { tenantId, isActive: true }, select });
  }
}
