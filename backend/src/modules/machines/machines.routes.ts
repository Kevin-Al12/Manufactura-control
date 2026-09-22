import { Router } from "express";
import { z } from "zod";
import { MachineStatus, Role } from "@prisma/client";
import * as machinesService from "./machines.service";
import { authenticate, authorize } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const machinesRouter = Router();
machinesRouter.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  area: z.string().optional(),
});

machinesRouter.post("/", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const machine = await machinesService.createMachine(req.auth!.tenantId, input);
    res.status(201).json({ machine });
  } catch (err) {
    next(toHttpError(err));
  }
});

machinesRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const machines = await machinesService.listMachines(req.auth!.tenantId);
    res.json({ machines });
  } catch (err) {
    next(err);
  }
});

machinesRouter.get("/:id", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const machine = await machinesService.getMachine(req.auth!.tenantId, req.params.id!);
    res.json({ machine });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.nativeEnum(MachineStatus), note: z.string().optional() });

machinesRouter.patch("/:id/status", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const input = statusSchema.parse(req.body);
    const machine = await machinesService.setMachineStatus(req.auth!.tenantId, req.params.id!, input.status, input.note);
    res.json({ machine });
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
