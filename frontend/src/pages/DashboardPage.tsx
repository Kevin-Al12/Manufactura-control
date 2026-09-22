import { useEffect, useState } from "react";
import * as api from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { DonutChart } from "../components/DonutChart";
import { TrendChart } from "../components/TrendChart";
import { IconTotal, IconCheck, IconAlert, IconClock, IconTarget } from "../components/icons";
import type { EventType, NotificationItem, NotificationStats, User } from "../types";

const PAGE_SIZE = 15;

export function DashboardPage() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recipientUserId, setRecipientUserId] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    api.listUsers().then((r) => setUsers(r.users)).catch(() => {});
    api.listEventTypes().then((r) => setEventTypes(r.eventTypes)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const filter = {
      recipientUserId: recipientUserId || undefined,
      eventTypeId: eventTypeId || undefined,
      status: status || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    };

    Promise.all([api.getNotificationStats({ from: filter.from, to: filter.to }), api.listNotifications(filter)])
      .then(([statsRes, listRes]) => {
        setStats(statsRes.stats);
        setItems(listRes.items);
        setTotal(listRes.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el dashboard"))
      .finally(() => setLoading(false));
  }, [recipientUserId, eventTypeId, status, from, to, page]);

  function resetFilters() {
    setRecipientUserId("");
    setEventTypeId("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Notificaciones enviadas, tasa de entrega y fallos</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="icon-badge" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
            <IconTotal width={16} height={16} />
          </div>
          <div className="label">Total</div>
          <div className="value">{stats?.total ?? "-"}</div>
        </div>
        <div className="stat-card">
          <div className="icon-badge" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
            <IconCheck width={16} height={16} />
          </div>
          <div className="label">Enviadas</div>
          <div className="value" style={{ color: "var(--success)" }}>
            {stats?.sent ?? "-"}
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
            <IconAlert width={16} height={16} />
          </div>
          <div className="label">Fallidas</div>
          <div className="value" style={{ color: "var(--danger)" }}>
            {stats?.failed ?? "-"}
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
            <IconClock width={16} height={16} />
          </div>
          <div className="label">En curso</div>
          <div className="value" style={{ color: "var(--warning)" }}>
            {(stats?.pending ?? 0) + (stats?.queued ?? 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="icon-badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
            <IconTarget width={16} height={16} />
          </div>
          <div className="label">Tasa de entrega</div>
          <div className="value">{stats ? `${Math.round(stats.deliveryRate * 100)}%` : "-"}</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <h3>Notificaciones por dia</h3>
          <p className="chart-subtitle">Ultimos 14 dias — enviadas vs. fallidas</p>
          {stats && stats.byDay.length > 0 ? (
            <TrendChart data={stats.byDay} />
          ) : (
            <div className="empty-state">Sin datos todavia</div>
          )}
        </div>
        <div className="card chart-card">
          <h3>Distribucion por estado</h3>
          <p className="chart-subtitle">Segun los filtros aplicados</p>
          {stats && (
            <DonutChart
              segments={[
                { label: "Enviadas", value: stats.sent, color: "var(--success)" },
                { label: "Fallidas", value: stats.failed, color: "var(--danger)" },
                { label: "Pendientes", value: stats.pending, color: "var(--warning)" },
                { label: "Encoladas", value: stats.queued, color: "var(--info)" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="filters-bar card">
        <div className="field">
          <label>Empleado</label>
          <select
            value={recipientUserId}
            onChange={(e) => {
              setPage(1);
              setRecipientUserId(e.target.value);
            }}
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Tipo de evento</label>
          <select
            value={eventTypeId}
            onChange={(e) => {
              setPage(1);
              setEventTypeId(e.target.value);
            }}
          >
            <option value="">Todos</option>
            {eventTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Estado</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="QUEUED">Encolada</option>
            <option value="SENT">Enviada</option>
            <option value="FAILED">Fallida</option>
          </select>
        </div>
        <div className="field">
          <label>Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </div>
        <div className="field">
          <label>Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </div>
        <button className="btn btn-sm" onClick={resetFilters}>
          Limpiar filtros
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo de evento</th>
              <th>Destinatario</th>
              <th>Mensaje</th>
              <th>Estado</th>
              <th>Intentos</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}>
                <td>{new Date(n.createdAt).toLocaleString()}</td>
                <td>{n.eventType.name}</td>
                <td>{n.recipientUser?.name ?? n.recipientEmail}</td>
                <td className="wrap">
                  {n.renderedMessage}
                  {n.status === "FAILED" && n.lastError && (
                    <div className="error-text" style={{ marginTop: 4 }}>
                      {n.lastError}
                    </div>
                  )}
                </td>
                <td>
                  <StatusBadge status={n.status} />
                </td>
                <td>
                  {n.attempts}/{n.maxAttempts}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">No hay notificaciones con estos filtros.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </button>
        <span>
          Pagina {page} de {totalPages} ({total} notificaciones)
        </span>
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
