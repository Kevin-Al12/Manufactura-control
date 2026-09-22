import { Router } from "express";
import { z } from "zod";
import { PurchaseOrderStatus, Role } from "@prisma/client";
import * as inventoryService from "./inventory.service";
import { authenticate, authorize } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
  reorderThreshold: z.number().int().positive().optional(),
});

inventoryRouter.post("/", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const item = await inventoryService.createInventoryItem(req.auth!.tenantId, input);
    res.status(201).json({ item });
  } catch (err) {
    next(toHttpError(err));
  }
});

inventoryRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const items = await inventoryService.listInventory(req.auth!.tenantId);
    res.json({ items });
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

export const purchaseOrdersRouter = Router();
purchaseOrdersRouter.use(authenticate);

purchaseOrdersRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const { status } = req.query;
    const purchaseOrders = await inventoryService.listPurchaseOrders(req.auth!.tenantId, {
      status: typeof status === "string" ? (status as PurchaseOrderStatus) : undefined,
    });
    res.json({ purchaseOrders });
  } catch (err) {
    next(err);
  }
});

purchaseOrdersRouter.post("/:id/receive", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const purchaseOrder = await inventoryService.receivePurchaseOrder(req.auth!.tenantId, req.params.id!);
    res.json({ purchaseOrder });
  } catch (err) {
    next(err);
  }
});
