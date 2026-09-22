import { NotificationStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../middleware/errorHandler";

export interface ListNotificationsFilter {
  recipientUserId?: string;
  eventTypeId?: string;
  status?: NotificationStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listNotifications(tenantId: string, filter: ListNotificationsFilter = {}) {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize = filter.pageSize && filter.pageSize > 0 && filter.pageSize <= 100 ? filter.pageSize : 25;

  const where = {
    tenantId,
    ...(filter.recipientUserId ? { recipientUserId: filter.recipientUserId } : {}),
    ...(filter.eventTypeId ? { eventTypeId: filter.eventTypeId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.from || filter.to
      ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        eventType: { select: { id: true, name: true, triggerKey: true } },
        recipientUser: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getNotification(tenantId: string, id: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, tenantId },
    include: {
      eventType: { select: { id: true, name: true, triggerKey: true } },
      recipientUser: { select: { id: true, name: true, email: true } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!notification) throw new HttpError(404, "Notificacion no encontrada");
  return notification;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  sent: number;
  failed: number;
  other: number;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  queued: number;
  deliveryRate: number; // sent / (sent + failed), 0 si no hay ninguna resuelta todavia
  byDay: DailyStat[]; // ultimos 14 dias, para graficar tendencia
}

const TREND_DAYS = 14;

export async function getStats(tenantId: string, filter: { from?: Date; to?: Date } = {}): Promise<NotificationStats> {
  const where = {
    tenantId,
    ...(filter.from || filter.to
      ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
      : {}),
  };

  const grouped = await prisma.notification.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const counts: Record<NotificationStatus, number> = { PENDING: 0, QUEUED: 0, SENT: 0, FAILED: 0 };
  for (const row of grouped) counts[row.status] = row._count._all;

  const total = counts.PENDING + counts.QUEUED + counts.SENT + counts.FAILED;
  const resolved = counts.SENT + counts.FAILED;

  const byDay = await getDailyStats(tenantId, TREND_DAYS);

  return {
    total,
    sent: counts.SENT,
    failed: counts.FAILED,
    pending: counts.PENDING,
    queued: counts.QUEUED,
    deliveryRate: resolved === 0 ? 0 : Number((counts.SENT / resolved).toFixed(4)),
    byDay,
  };
}

interface DailyStatRow {
  day: Date;
  status: NotificationStatus;
  count: bigint;
}

async function getDailyStats(tenantId: string, days: number): Promise<DailyStat[]> {
  const rows = await prisma.$queryRaw<DailyStatRow[]>`
    SELECT date_trunc('day', created_at) AS day, status, count(*)::bigint AS count
    FROM notifications
    WHERE tenant_id = ${tenantId}
      AND created_at >= now() - (${days}::text || ' days')::interval
    GROUP BY day, status
    ORDER BY day
  `;

  const byDate = new Map<string, DailyStat>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, sent: 0, failed: 0, other: 0 });
  }

  for (const row of rows) {
    const key = row.day.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (!bucket) continue; // fuera del rango solicitado
    const count = Number(row.count);
    if (row.status === "SENT") bucket.sent += count;
    else if (row.status === "FAILED") bucket.failed += count;
    else bucket.other += count;
  }

  return Array.from(byDate.values());
}
