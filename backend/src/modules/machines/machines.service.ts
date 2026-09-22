import { MachineStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";

export interface CreateMachineInput {
  name: string;
  area?: string;
}

export async function createMachine(tenantId: string, input: CreateMachineInput) {
  const existing = await prisma.machine.findUnique({ where: { tenantId_name: { tenantId, name: input.name } } });
  if (existing) throw new HttpError(409, "Ya existe una maquina con ese nombre");

  return prisma.machine.create({ data: { tenantId, name: input.name, area: input.area } });
}

export async function listMachines(tenantId: string) {
  const machines = await prisma.machine.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failureCounts = await prisma.machineStatusLog.groupBy({
    by: ["machineId"],
    where: { tenantId, status: MachineStatus.DOWN, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const failureByMachine = new Map(failureCounts.map((f) => [f.machineId, f._count._all]));

  return machines.map((m) => ({ ...m, failures24h: failureByMachine.get(m.id) ?? 0 }));
}

export async function getMachine(tenantId: string, id: string) {
  const machine = await prisma.machine.findFirst({
    where: { id, tenantId },
    include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!machine) throw new HttpError(404, "Maquina no encontrada");
  return machine;
}

/** Cambia el estado y deja rastro en MachineStatusLog. Usado por el simulador y por un cambio manual desde el panel. */
export async function setMachineStatus(tenantId: string, id: string, status: MachineStatus, note?: string) {
  const result = await prisma.machine.updateMany({ where: { id, tenantId }, data: { status } });
  if (result.count === 0) throw new HttpError(404, "Maquina no encontrada");

  await prisma.machineStatusLog.create({ data: { tenantId, machineId: id, status, note } });
  return prisma.machine.findFirstOrThrow({ where: { id, tenantId } });
}
