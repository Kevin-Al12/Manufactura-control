import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { tenantsRouter } from "./modules/tenants/tenants.routes";
import { eventTypesRouter } from "./modules/eventTypes/eventTypes.routes";
import { eventsRouter } from "./modules/events/events.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { machinesRouter } from "./modules/machines/machines.routes";
import { workOrdersRouter } from "./modules/workOrders/workOrders.routes";
import { simulatorRouter } from "./modules/simulator/simulator.routes";
import { inventoryRouter, purchaseOrdersRouter } from "./modules/inventory/inventory.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/tenant", tenantsRouter);
  app.use("/api/event-types", eventTypesRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/machines", machinesRouter);
  app.use("/api/work-orders", workOrdersRouter);
  app.use("/api/simulator", simulatorRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/purchase-orders", purchaseOrdersRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
