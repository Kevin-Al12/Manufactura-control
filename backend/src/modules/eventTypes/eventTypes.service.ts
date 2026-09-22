import cron from "node-cron";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { Channel } from "@prisma/client";
import type { RecipientRule } from "./recipientRule";
import { registerSchedule, unregisterSchedule } from "../../queue/scheduler";

export interface CreateEventTypeInput {
  name: string;
  triggerKey: string;
  description?: string;
  recipientRule: RecipientRule;
  messageTemplate: string;
  channel?: Channel;
  schedule?: string | null;
}

function assertValidSchedule(schedule?: string | null) {
  if (schedule && !cron.validate(schedule)) {
    throw new HttpError(400, `Expresion cron invalida: "${schedule}"`);
  }
}

export async function createEventType(tenantId: string, input: CreateEventTypeInput) {
  assertValidSchedule(input.schedule);

  const existing = await prisma.eventType.findUnique({
    where: { tenantId_triggerKey: { tenantId, triggerKey: input.triggerKey } },
  });
  if (existing) throw new HttpError(409, "Ya existe un tipo de evento con ese trigger_key en la empresa");

  const eventType = await prisma.eventType.create({
    data: {
      tenantId,
      name: input.name,
      triggerKey: input.triggerKey,
      description: input.description,
      recipientRule: input.recipientRule,
      messageTemplate: input.messageTemplate,
      channel: input.channel ?? Channel.EMAIL,
      schedule: input.schedule ?? null,
    },
  });

  if (eventType.schedule && eventType.isActive) {
    registerSchedule(eventType.id, eventType.tenantId, eventType.triggerKey, eventType.schedule);
  }

  return eventType;
}

export async function listEventTypes(tenantId: string) {
  return prisma.eventType.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function getEventType(tenantId: string, id: string) {
  const eventType = await prisma.eventType.findFirst({ where: { id, tenantId } });
  if (!eventType) throw new HttpError(404, "Tipo de evento no encontrado");
  return eventType;
}

export interface UpdateEventTypeInput {
  name?: string;
  description?: string;
  recipientRule?: RecipientRule;
  messageTemplate?: string;
  channel?: Channel;
  schedule?: string | null;
  isActive?: boolean;
}

export async function updateEventType(tenantId: string, id: string, input: UpdateEventTypeInput) {
  assertValidSchedule(input.schedule);

  const result = await prisma.eventType.updateMany({
    where: { id, tenantId },
    data: input,
  });
  if (result.count === 0) throw new HttpError(404, "Tipo de evento no encontrado");

  const eventType = await getEventType(tenantId, id);

  // Resincroniza el cron: se quita si se desactivo/quito el schedule, se
  // (re)registra si sigue activo y con schedule valido.
  unregisterSchedule(eventType.id);
  if (eventType.schedule && eventType.isActive) {
    registerSchedule(eventType.id, eventType.tenantId, eventType.triggerKey, eventType.schedule);
  }

  return eventType;
}
