import { Router } from "express";
import { z } from "zod";
import { Role, WorkOrderStatus } from "@prisma/client";
import * as workOrdersService from "./workOrders.service";
import { authenticate, authorize } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const workOrdersRouter = Router();
workOrdersRouter.use(authenticate);

const createSchema = z.object({
  code: z.string().min(1),
  area: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  machineId: z.string().uuid().optional(),
});

workOrdersRouter.post("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const workOrder = await workOrdersService.createWorkOrder(req.auth!.tenantId, input);
    res.status(201).json({ workOrder });
  } catch (err) {
    next(toHttpError(err));
  }
});

workOrdersRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const { status } = req.query;
    const workOrders = await workOrdersService.listWorkOrders(req.auth!.tenantId, {
      status: typeof status === "string" ? (status as WorkOrderStatus) : undefined,
    });
    res.json({ workOrders });
  } catch (err) {
    next(err);
  }
});

workOrdersRouter.post("/:id/advance", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const workOrder = await workOrdersService.advanceWorkOrder(req.auth!.tenantId, req.params.id!);
    res.json({ workOrder });
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
