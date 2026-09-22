import { Router } from "express";
import { z } from "zod";
import { Channel, Role } from "@prisma/client";
import * as eventTypesService from "./eventTypes.service";
import { recipientRuleSchema } from "./recipientRule";
import { authenticate, authorize } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const eventTypesRouter = Router();
eventTypesRouter.use(authenticate);

const triggerKeyRegex = /^[a-z][a-z0-9_]*$/;

const createSchema = z.object({
  name: z.string().min(2),
  triggerKey: z
    .string()
    .min(2)
    .regex(triggerKeyRegex, "trigger_key debe ser snake_case (ej: lote_listo)"),
  description: z.string().optional(),
  recipientRule: recipientRuleSchema,
  messageTemplate: z.string().min(1),
  channel: z.nativeEnum(Channel).optional(),
  schedule: z.string().optional(),
});

eventTypesRouter.post("/", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const eventType = await eventTypesService.createEventType(req.auth!.tenantId, input);
    res.status(201).json({ eventType });
  } catch (err) {
    next(toHttpError(err));
  }
});

eventTypesRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const eventTypes = await eventTypesService.listEventTypes(req.auth!.tenantId);
    res.json({ eventTypes });
  } catch (err) {
    next(err);
  }
});

eventTypesRouter.get("/:id", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const eventType = await eventTypesService.getEventType(req.auth!.tenantId, req.params.id!);
    res.json({ eventType });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  recipientRule: recipientRuleSchema.optional(),
  messageTemplate: z.string().min(1).optional(),
  channel: z.nativeEnum(Channel).optional(),
  schedule: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

eventTypesRouter.patch("/:id", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const eventType = await eventTypesService.updateEventType(req.auth!.tenantId, req.params.id!, input);
    res.json({ eventType });
  } catch (err) {
    next(toHttpError(err));
  }
});

// Desactivar en vez de borrar: preserva el historial de eventos/notificaciones ya generados.
eventTypesRouter.delete("/:id", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const eventType = await eventTypesService.updateEventType(req.auth!.tenantId, req.params.id!, {
      isActive: false,
    });
    res.json({ eventType });
  } catch (err) {
    next(err);
  }
});

function toHttpError(err: unknown) {
  if (err instanceof z.ZodError) {
    return new HttpError(400, err.issues.map((i) => i.message).join(", "));
  }
  return err;
}
