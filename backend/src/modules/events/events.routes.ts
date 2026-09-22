import { Router } from "express";
import { z } from "zod";
import { EventSource } from "@prisma/client";
import * as eventsService from "./events.service";
import { authenticateTenant } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const eventsRouter = Router();

const triggerSchema = z.object({
  triggerKey: z.string().min(1),
  // Identifica de forma UNICA a esta ocurrencia real del evento (ej. id
  // de lote, id del mensaje del webhook, etc). Repetir la misma clave no
  // genera una segunda notificacion.
  idempotencyKey: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
});

eventsRouter.post("/trigger", authenticateTenant, async (req, res, next) => {
  try {
    const input = triggerSchema.parse(req.body);
    const source = req.tenantAuth!.via === "apiKey" ? EventSource.WEBHOOK : EventSource.API;
    const result = await eventsService.triggerEvent(req.tenantAuth!.tenantId, { ...input, source });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    next(toHttpError(err));
  }
});

function toHttpError(err: unknown) {
  if (err instanceof z.ZodError) {
    return new HttpError(400, err.issues.map((i) => i.message).join(", "));
  }
  return err;
}
