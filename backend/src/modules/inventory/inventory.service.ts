import { PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";
import { triggerEvent } from "../events/events.service";

export interface CreateInventoryItemInput {
  name: string;
  sku: string;
  unit?: string;
  quantity?: number;
  reorderThreshold?: number;
}

export async function createInventoryItem(tenantId: string, input: CreateInventoryItemInput) {
  const existing = await prisma.inventoryItem.findUnique({ where: { tenantId_sku: { tenantId, sku: input.sku } } });
  if (existing) throw new HttpError(409, "Ya existe un insumo con ese SKU");

  return prisma.inventoryItem.create({
    data: {
      tenantId,
      name: input.name,
      sku: input.sku,
      unit: input.unit ?? "kg",
      quantity: input.quantity ?? 0,
      reorderThreshold: input.reorderThreshold ?? 50,
    },
  });
}

export async function listInventory(tenantId: string) {
  return prisma.inventoryItem.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function listPurchaseOrders(tenantId: string, filter: { status?: PurchaseOrderStatus } = {}) {
  return prisma.purchaseOrder.findMany({
    where: { tenantId, ...(filter.status ? { status: filter.status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } } },
  });
}

/**
 * Consume materia prima (llamado por el simulador al arrancar una orden
 * de trabajo — simula el MES tirando de stock del ERP). Si el stock
 * resultante cae debajo del umbral de reposicion y no hay ya una compra
 * pendiente para ese insumo, genera una PurchaseOrder automatica y, si el
 * tenant tiene el event_type configurado, dispara "stock_bajo" a traves
 * del mismo motor de eventos de siempre.
 */
export async function consumeInventory(tenantId: string, itemId: string, amount: number) {
  const current = await prisma.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
  if (!current) return;

  // Nunca baja de 0: si piden mas de lo que hay, consume lo que queda y
  // se corta ahi (antes se podia ir a negativo sin limite).
  const actualAmount = Math.min(amount, current.quantity);
  if (actualAmount <= 0) return;

  const item = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { quantity: { decrement: actualAmount } },
  });
  if (item.quantity >= item.reorderThreshold) return;

  const pendingPO = await prisma.purchaseOrder.findFirst({
    where: { tenantId, inventoryItemId: item.id, status: PurchaseOrderStatus.PENDING },
  });
  if (pendingPO) return;

  const restockQuantity = item.reorderThreshold * 3;
  await prisma.purchaseOrder.create({
    data: { tenantId, inventoryItemId: item.id, quantity: restockQuantity },
  });

  try {
    await triggerEvent(tenantId, {
      triggerKey: "stock_bajo",
      idempotencyKey: `stock-bajo-${item.id}-${Date.now()}`,
      payload: { insumo: item.name, cantidad_actual: item.quantity, unidad: item.unit },
      source: "API",
    });
  } catch (err) {
    if (!(err instanceof HttpError && err.status === 404)) throw err;
    // Tenant sin event_type "stock_bajo" configurado: la compra se genera igual, solo que sin notificar.
  }
}

export async function receivePurchaseOrder(tenantId: string, id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
  if (!po) throw new HttpError(404, "Orden de compra no encontrada");
  if (po.status === PurchaseOrderStatus.RECEIVED) throw new HttpError(400, "La orden ya fue recibida");

  const [updatedPO] = await prisma.$transaction([
    prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.RECEIVED, receivedAt: new Date() } }),
    prisma.inventoryItem.update({ where: { id: po.inventoryItemId }, data: { quantity: { increment: po.quantity } } }),
  ]);

  return updatedPO;
}
