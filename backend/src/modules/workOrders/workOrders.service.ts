import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { triggerEvent } from "../events/events.service";

const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  CREATED: WorkOrderStatus.IN_PROGRESS,
  IN_PROGRESS: WorkOrderStatus.READY,
  READY: WorkOrderStatus.INSPECTED,
};

export interface CreateWorkOrderInput {
  code: string;
  area?: string;
  quantity?: number;
  machineId?: string;
}

export async function createWorkOrder(tenantId: string, input: CreateWorkOrderInput) {
  const existing = await prisma.workOrder.findUnique({ where: { tenantId_code: { tenantId, code: input.code } } });
  if (existing) throw new HttpError(409, "Ya existe una orden de trabajo con ese codigo");

  return prisma.workOrder.create({
    data: {
      tenantId,
      code: input.code,
      area: input.area,
      quantity: input.quantity ?? 1,
      machineId: input.machineId,
    },
  });
}

export async function listWorkOrders(tenantId: string, filter: { status?: WorkOrderStatus } = {}) {
  return prisma.workOrder.findMany({
    where: { tenantId, ...(filter.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { machine: { select: { id: true, name: true } } },
  });
}

/**
 * Avanza una orden al siguiente estado del ciclo de vida (simulacro de
 * MES: CREATED -> IN_PROGRESS -> READY -> INSPECTED). Al llegar a READY
 * dispara un evento real "lote_listo" a traves del MISMO motor que usa
 * el resto del sistema — si el tenant no tiene ese tipo de evento
 * configurado, la orden igual avanza, solo que sin notificar a nadie.
 */
export async function advanceWorkOrder(tenantId: string, id: string) {
  const order = await prisma.workOrder.findFirst({ where: { id, tenantId } });
  if (!order) throw new HttpError(404, "Orden de trabajo no encontrada");

  const next = NEXT_STATUS[order.status];
  if (!next) throw new HttpError(400, `La orden ya esta en estado final (${order.status})`);

  const timestampField =
    next === WorkOrderStatus.IN_PROGRESS
      ? { startedAt: new Date() }
      : next === WorkOrderStatus.READY
        ? { readyAt: new Date() }
        : next === WorkOrderStatus.INSPECTED
          ? { inspectedAt: new Date() }
          : {};

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: next, ...timestampField },
  });

  if (next === WorkOrderStatus.READY) {
    try {
      await triggerEvent(tenantId, {
        triggerKey: "lote_listo",
        idempotencyKey: `workorder-ready-${updated.id}`,
        payload: { lote_id: updated.code, area: updated.area ?? "" },
        source: "API",
      });
    } catch (err) {
      if (!(err instanceof HttpError && err.status === 404)) throw err;
      // El tenant no tiene configurado un event_type "lote_listo": la orden
      // avanza igual, simplemente no se genera notificacion.
    }
  }

  return updated;
}
