export type Role = "ADMIN" | "SUPERVISOR" | "EMPLEADO";
export type Channel = "EMAIL" | "WHATSAPP";
export type NotificationStatus = "PENDING" | "QUEUED" | "SENT" | "FAILED";

/** Lo que cualquier usuario recibe al loguearse. Sin la apiKey. */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

/** Solo para ADMIN, via GET /api/tenant. */
export interface TenantDetail extends Tenant {
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  area: string | null;
  shift: string | null;
  phone: string | null;
  contactChannel: Channel;
  isActive: boolean;
  createdAt: string;
}

export type RecipientRule =
  | { type: "ROLE"; value: Role }
  | { type: "AREA"; value: string }
  | { type: "USERS"; value: string[] }
  | { type: "ALL" };

export interface EventType {
  id: string;
  tenantId: string;
  name: string;
  triggerKey: string;
  description: string | null;
  recipientRule: RecipientRule;
  messageTemplate: string;
  channel: Channel;
  schedule: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  status: NotificationStatus;
  channel: Channel;
  recipientEmail: string;
  renderedMessage: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  failedAt: string | null;
  eventType: { id: string; name: string; triggerKey: string };
  recipientUser: { id: string; name: string; email: string } | null;
}

export interface NotificationLogEntry {
  id: string;
  status: NotificationStatus;
  message: string | null;
  createdAt: string;
}

export interface NotificationDetail extends NotificationItem {
  logs: NotificationLogEntry[];
}

export interface DailyStat {
  date: string;
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
  deliveryRate: number;
  byDay: DailyStat[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  tenant: Tenant;
  user: User;
}

export type MachineStatus = "RUNNING" | "IDLE" | "DOWN" | "MAINTENANCE";
export type WorkOrderStatus = "CREATED" | "IN_PROGRESS" | "READY" | "INSPECTED" | "CANCELLED";

export interface Machine {
  id: string;
  tenantId: string;
  name: string;
  area: string | null;
  status: MachineStatus;
  isActive: boolean;
  createdAt: string;
  failures24h: number;
}

export interface MachineStatusLogEntry {
  id: string;
  status: MachineStatus;
  note: string | null;
  createdAt: string;
}

export interface MachineDetail extends Machine {
  statusLogs: MachineStatusLogEntry[];
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  code: string;
  area: string | null;
  quantity: number;
  status: WorkOrderStatus;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  inspectedAt: string | null;
  machine: { id: string; name: string } | null;
}

export interface SimulatorStatus {
  running: boolean;
  startedAt: string | null;
}

export interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  reorderThreshold: number;
  createdAt: string;
}

export type PurchaseOrderStatus = "PENDING" | "RECEIVED";

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  quantity: number;
  status: PurchaseOrderStatus;
  createdAt: string;
  receivedAt: string | null;
  inventoryItem: { id: string; name: string; sku: string; unit: string };
}
