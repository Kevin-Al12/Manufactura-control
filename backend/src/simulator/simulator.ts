import { MachineStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { triggerEvent } from "../modules/events/events.service";
import { setMachineStatus } from "../modules/machines/machines.service";
import { advanceWorkOrder, createWorkOrder } from "../modules/workOrders/workOrders.service";
import { consumeInventory } from "../modules/inventory/inventory.service";
import { HttpError } from "../middleware/errorHandler";

// Simulacro en memoria de las capas SCADA (maquinas), MES (ordenes de
// trabajo) y ERP (inventario/compras). Nunca toca hardware ni sistemas
// reales: son timers que mueven filas en Postgres y, cuando corresponde,
// pasan por el MISMO motor de eventos que usa el resto del sistema
// (src/modules/events/events.service.ts). Estado por tenant, vive solo en
// este proceso — si el API se reinicia, el simulador queda detenido (hay
// que volver a iniciarlo desde el panel).

const MACHINE_TICK_MS = 8_000;
const ORDER_TICK_MS = 12_000;
const MAX_OPEN_ORDERS = 8;

const DEFAULT_MACHINES = [
  { name: "Inyectora-1", area: "Moldeo" },
  { name: "Inyectora-2", area: "Moldeo" },
  { name: "Ensambladora-1", area: "Ensamble" },
];

const DEFAULT_INVENTORY = [
  { name: "Resina PP", sku: "MP-PP-001", unit: "kg", quantity: 400, reorderThreshold: 120 },
  { name: "Resina ABS", sku: "MP-ABS-002", unit: "kg", quantity: 300, reorderThreshold: 100 },
  { name: "Tornillos M4", sku: "MP-TOR-003", unit: "unidades", quantity: 2000, reorderThreshold: 500 },
];

const FAILURE_REASONS = [
  "sobrecalentamiento",
  "falla de sensor",
  "atasco de material",
  "perdida de presion",
  "corte electrico",
];

interface RunningSimulator {
  machineTimer: NodeJS.Timeout;
  orderTimer: NodeJS.Timeout;
  startedAt: Date;
}

const running = new Map<string, RunningSimulator>();

function currentShiftLabel(): string {
  const hour = new Date().getHours();
  if (hour < 14) return "Manana";
  if (hour < 22) return "Tarde";
  return "Noche";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

async function tickMachines(tenantId: string) {
  const machines = await prisma.machine.findMany({ where: { tenantId, isActive: true } });

  for (const machine of machines) {
    const roll = Math.random();
    let next: MachineStatus | null = null;

    if (machine.status === MachineStatus.RUNNING && roll < 0.08) next = MachineStatus.DOWN;
    else if (machine.status === MachineStatus.IDLE && roll < 0.3) next = MachineStatus.RUNNING;
    else if (machine.status === MachineStatus.DOWN && roll < 0.5) next = MachineStatus.RUNNING;

    if (!next) continue;

    const note = next === MachineStatus.DOWN ? pick(FAILURE_REASONS) : "recuperada";
    await setMachineStatus(tenantId, machine.id, next, note);

    if (next === MachineStatus.DOWN) {
      // Conecta la falla con lo que se estaba produciendo en esa maquina:
      // si hay una orden IN_PROGRESS ahi, se menciona en la notificacion
      // (sin esto, la falla y la orden afectada quedaban sin relacion
      // alguna en el sistema).
      const affectedOrder = await prisma.workOrder.findFirst({
        where: { tenantId, machineId: machine.id, status: WorkOrderStatus.IN_PROGRESS },
      });
      const detalle = affectedOrder ? `${note} — afecto la orden ${affectedOrder.code}` : note;

      try {
        await triggerEvent(tenantId, {
          triggerKey: "falla_maquina",
          idempotencyKey: `sim-machine-down-${machine.id}-${Date.now()}`,
          payload: {
            maquina: machine.name,
            detalle,
            turno: currentShiftLabel(),
            orden_afectada: affectedOrder?.code ?? "",
          },
          source: "API",
        });
      } catch (err) {
        if (!(err instanceof HttpError && err.status === 404)) throw err;
        // Tenant sin event_type "falla_maquina" configurado: la maquina
        // igual cambia de estado, solo que no se notifica a nadie.
      }
    }
  }
}

async function tickOrders(tenantId: string) {
  // Incluye READY: si no, esas ordenes se quedan "Lista" para siempre y
  // nunca llegan a INSPECTED (bug detectado en pruebas manuales).
  const openOrders = await prisma.workOrder.findMany({
    where: {
      tenantId,
      status: { in: [WorkOrderStatus.CREATED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.READY] },
    },
  });

  for (const order of openOrders) {
    if (Math.random() >= 0.5) continue;
    const wasCreated = order.status === WorkOrderStatus.CREATED;
    const updated = await advanceWorkOrder(tenantId, order.id);

    // El MES "arranca" la orden: consume materia prima del ERP. Si el
    // stock cae debajo del umbral, consumeInventory genera sola una
    // PurchaseOrder y dispara "stock_bajo" (best-effort).
    if (wasCreated && updated.status === WorkOrderStatus.IN_PROGRESS) {
      const items = await prisma.inventoryItem.findMany({ where: { tenantId } });
      if (items.length > 0) {
        const item = pick(items);
        const amount = 20 + Math.floor(Math.random() * 60);
        await consumeInventory(tenantId, item.id, amount);
      }
    }
  }

  if (openOrders.length < MAX_OPEN_ORDERS && Math.random() < 0.6) {
    const total = await prisma.workOrder.count({ where: { tenantId } });
    const runningMachines = await prisma.machine.findMany({
      where: { tenantId, isActive: true, status: MachineStatus.RUNNING },
    });
    const machine = runningMachines.length > 0 ? pick(runningMachines) : null;

    await createWorkOrder(tenantId, {
      code: `OT-${1000 + total + 1}`,
      area: machine?.area ?? pick(["Moldeo", "Ensamble"]),
      quantity: 50 + Math.floor(Math.random() * 450),
      machineId: machine?.id,
    });
  }
}

async function ensureDefaultMachines(tenantId: string) {
  const count = await prisma.machine.count({ where: { tenantId } });
  if (count > 0) return;

  await prisma.machine.createMany({
    data: DEFAULT_MACHINES.map((m) => ({ ...m, tenantId, status: MachineStatus.RUNNING })),
  });
  const created = await prisma.machine.findMany({ where: { tenantId } });
  await prisma.machineStatusLog.createMany({
    data: created.map((m) => ({ tenantId, machineId: m.id, status: MachineStatus.RUNNING, note: "arranque del simulacro" })),
  });
}

async function ensureDefaultInventory(tenantId: string) {
  const count = await prisma.inventoryItem.count({ where: { tenantId } });
  if (count > 0) return;

  await prisma.inventoryItem.createMany({ data: DEFAULT_INVENTORY.map((i) => ({ ...i, tenantId })) });
}

export async function startSimulator(tenantId: string) {
  if (running.has(tenantId)) return { running: true, startedAt: running.get(tenantId)!.startedAt };

  await ensureDefaultMachines(tenantId);
  await ensureDefaultInventory(tenantId);

  const machineTimer = setInterval(() => {
    tickMachines(tenantId).catch((err) => console.error(`[simulator] error en maquinas (tenant ${tenantId}):`, err));
  }, MACHINE_TICK_MS);

  const orderTimer = setInterval(() => {
    tickOrders(tenantId).catch((err) => console.error(`[simulator] error en ordenes (tenant ${tenantId}):`, err));
  }, ORDER_TICK_MS);

  const startedAt = new Date();
  running.set(tenantId, { machineTimer, orderTimer, startedAt });
  console.log(`[simulator] iniciado para tenant ${tenantId}`);
  return { running: true, startedAt };
}

export function stopSimulator(tenantId: string) {
  const state = running.get(tenantId);
  if (!state) return { running: false };

  clearInterval(state.machineTimer);
  clearInterval(state.orderTimer);
  running.delete(tenantId);
  console.log(`[simulator] detenido para tenant ${tenantId}`);
  return { running: false };
}

export function getSimulatorStatus(tenantId: string) {
  const state = running.get(tenantId);
  return state ? { running: true, startedAt: state.startedAt } : { running: false, startedAt: null };
}
