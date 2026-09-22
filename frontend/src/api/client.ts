import type {
  AuthResponse,
  EventType,
  InventoryItem,
  Machine,
  MachineDetail,
  NotificationDetail,
  NotificationItem,
  NotificationStats,
  PaginatedResult,
  PurchaseOrder,
  RecipientRule,
  Role,
  Channel,
  SimulatorStatus,
  Tenant,
  User,
  WorkOrder,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "co_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`);
  }
  return body as T;
}

// --- Auth / tenant ---

export function registerTenant(input: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  return request<AuthResponse>("/api/tenants/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { tenantSlug: string; email: string; password: string }) {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function getMe() {
  return request<{ user: User }>("/api/auth/me");
}

export function getTenant() {
  return request<{ tenant: Tenant }>("/api/tenant");
}

export function rotateApiKey() {
  return request<{ tenant: Tenant }>("/api/tenant/api-key/rotate", { method: "POST" });
}

// --- Users (empleados) ---

export function listUsers(filter: { role?: Role; area?: string; isActive?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (filter.role) qs.set("role", filter.role);
  if (filter.area) qs.set("area", filter.area);
  if (filter.isActive !== undefined) qs.set("isActive", String(filter.isActive));
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<{ users: User[] }>(`/api/users${suffix}`);
}

export interface CreateUserInput {
  email: string;
  name: string;
  role?: Role;
  area?: string;
  shift?: string;
  phone?: string;
  contactChannel?: Channel;
  password?: string;
}

export function createUser(input: CreateUserInput) {
  return request<{ user: User }>("/api/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateUser(id: string, input: Partial<CreateUserInput> & { isActive?: boolean }) {
  return request<{ user: User }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deactivateUser(id: string) {
  return request<{ user: User }>(`/api/users/${id}`, { method: "DELETE" });
}

// --- Event types ---

export interface EventTypeInput {
  name: string;
  triggerKey: string;
  description?: string;
  recipientRule: RecipientRule;
  messageTemplate: string;
  channel?: Channel;
  schedule?: string | null;
}

export function listEventTypes() {
  return request<{ eventTypes: EventType[] }>("/api/event-types");
}

export function createEventType(input: EventTypeInput) {
  return request<{ eventType: EventType }>("/api/event-types", { method: "POST", body: JSON.stringify(input) });
}

export function updateEventType(id: string, input: Partial<EventTypeInput> & { isActive?: boolean }) {
  return request<{ eventType: EventType }>(`/api/event-types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateEventType(id: string) {
  return request<{ eventType: EventType }>(`/api/event-types/${id}`, { method: "DELETE" });
}

// --- Events (disparo manual, util para probar desde el panel) ---

export function triggerEvent(input: { triggerKey: string; idempotencyKey: string; payload?: Record<string, unknown> }) {
  return request<{ eventId: string; duplicate: boolean; notificationsCreated: number }>("/api/events/trigger", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Notifications ---

export interface NotificationsFilter {
  recipientUserId?: string;
  eventTypeId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listNotifications(filter: NotificationsFilter = {}) {
  const qs = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<PaginatedResult<NotificationItem>>(`/api/notifications${suffix}`);
}

export function getMyNotifications(page = 1) {
  return request<PaginatedResult<NotificationItem>>(`/api/notifications/mine?page=${page}`);
}

export function getNotificationStats(filter: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams();
  if (filter.from) qs.set("from", filter.from);
  if (filter.to) qs.set("to", filter.to);
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<{ stats: NotificationStats }>(`/api/notifications/stats${suffix}`);
}

export function getNotification(id: string) {
  return request<{ notification: NotificationDetail }>(`/api/notifications/${id}`);
}

// --- Mini-MES: maquinas (SCADA simulado) ---

export function listMachines() {
  return request<{ machines: Machine[] }>("/api/machines");
}

export function getMachine(id: string) {
  return request<{ machine: MachineDetail }>(`/api/machines/${id}`);
}

export function createMachine(input: { name: string; area?: string }) {
  return request<{ machine: Machine }>("/api/machines", { method: "POST", body: JSON.stringify(input) });
}

// --- Mini-MES: ordenes de trabajo ---

export function listWorkOrders(status?: string) {
  const suffix = status ? `?status=${status}` : "";
  return request<{ workOrders: WorkOrder[] }>(`/api/work-orders${suffix}`);
}

export function createWorkOrder(input: { code: string; area?: string; quantity?: number; machineId?: string }) {
  return request<{ workOrder: WorkOrder }>("/api/work-orders", { method: "POST", body: JSON.stringify(input) });
}

export function advanceWorkOrder(id: string) {
  return request<{ workOrder: WorkOrder }>(`/api/work-orders/${id}/advance`, { method: "POST" });
}

// --- Simulador ---

export function getSimulatorStatus() {
  return request<SimulatorStatus>("/api/simulator/status");
}

export function startSimulator() {
  return request<SimulatorStatus>("/api/simulator/start", { method: "POST" });
}

export function stopSimulator() {
  return request<SimulatorStatus>("/api/simulator/stop", { method: "POST" });
}

// --- ERP-lite: inventario y compras ---

export function listInventory() {
  return request<{ items: InventoryItem[] }>("/api/inventory");
}

export function listPurchaseOrders(status?: string) {
  const suffix = status ? `?status=${status}` : "";
  return request<{ purchaseOrders: PurchaseOrder[] }>(`/api/purchase-orders${suffix}`);
}

export function receivePurchaseOrder(id: string) {
  return request<{ purchaseOrder: PurchaseOrder }>(`/api/purchase-orders/${id}/receive`, { method: "POST" });
}
