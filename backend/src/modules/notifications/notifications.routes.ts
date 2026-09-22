import { Router } from "express";
import { NotificationStatus, Role } from "@prisma/client";
import * as notificationsService from "./notifications.service";
import { authenticate, authorize } from "../../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Dashboard admin/supervisor: historial completo del tenant, filtrable.
notificationsRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const { recipientUserId, eventTypeId, status, from, to, page, pageSize } = req.query;
    const result = await notificationsService.listNotifications(req.auth!.tenantId, {
      recipientUserId: typeof recipientUserId === "string" ? recipientUserId : undefined,
      eventTypeId: typeof eventTypeId === "string" ? eventTypeId : undefined,
      status: typeof status === "string" ? (status as NotificationStatus) : undefined,
      from: parseDate(from),
      to: parseDate(to),
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get("/stats", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const stats = await notificationsService.getStats(req.auth!.tenantId, { from: parseDate(from), to: parseDate(to) });
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// Un empleado ve solo su propio historial.
notificationsRouter.get("/mine", async (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = await notificationsService.listNotifications(req.auth!.tenantId, {
      recipientUserId: req.auth!.userId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get("/:id", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const notification = await notificationsService.getNotification(req.auth!.tenantId, req.params.id!);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});
