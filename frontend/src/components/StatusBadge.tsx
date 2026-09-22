import type { NotificationStatus } from "../types";

const LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pendiente",
  QUEUED: "Encolada",
  SENT: "Enviada",
  FAILED: "Fallida",
};

export function StatusBadge({ status }: { status: NotificationStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
