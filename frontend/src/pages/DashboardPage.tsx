import { useEffect, useState } from "react";
import * as api from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { StatusBreakdown } from "../components/StatusBreakdown";
import { TrendChart } from "../components/TrendChart";
import { IconChevronLeft, IconChevronRight, IconX } from "../components/icons";
import { formatDateTime, formatNumber, initials } from "../format";
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
    api
      .listUsers()
      .then((r) => setUsers(r.users))
      .catch(() => {});
    api
      .listEventTypes()
      .then((r) => setEventTypes(r.eventTypes))
      .catch(() => {});
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
  const hasFilters = !!(recipientUserId || eventTypeId || status || from || to);
  const rangeLabel = from || to ? "En el rango elegido" : "Histórico completo";
  const inFlight = (stats?.pending ?? 0) + (stats?.queued ?? 0);
  const share = (v: number) => (stats && stats.total > 0 ? Math.round((v / stats.total) * 100) : 0);
  const rate = stats ? Math.round(stats.deliveryRate * 100) : null;
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(total, page * PAGE_SIZE);
  const loadingValue = <span className="skeleton" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Qué se avisó, a quién, y qué no llegó.</p>
        </div>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{stats ? formatNumber(stats.total) : loadingValue}</div>
          <div className="kpi-meta">{rangeLabel}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="swatch" style={{ background: "var(--chart-bar)" }} />
            Enviadas
          </div>
          <div className="kpi-value">{stats ? formatNumber(stats.sent) : loadingValue}</div>
          <div className="kpi-meta">{share(stats?.sent ?? 0)}% del total</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="swatch" style={{ background: "var(--danger)" }} />
            Fallidas
          </div>
          <div className="kpi-value" style={stats && stats.failed > 0 ? { color: "var(--danger)" } : undefined}>
            {stats ? formatNumber(stats.failed) : loadingValue}
          </div>
          <div className="kpi-meta">{share(stats?.failed ?? 0)}% del total</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <span className="swatch" style={{ background: "var(--warning)" }} />
            En curso
          </div>
          <div className="kpi-value">{stats ? formatNumber(inFlight) : loadingValue}</div>
          <div className="kpi-meta">{stats ? `${stats.pending} pendientes · ${stats.queued} encoladas` : " "}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tasa de entrega</div>
          <div className="kpi-value">
            {rate !== null ? (
              <>
                {rate}
                <span className="unit">%</span>
              </>
            ) : (
              loadingValue
            )}
          </div>
          <div className="meter">
            <span style={{ width: `${rate ?? 0}%` }} />
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="card chart-card">
          <div className="chart-card-head">
            <div>
              <h3>Notificaciones por día</h3>
              <p className="chart-subtitle">Últimos 14 días</p>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "var(--chart-bar)" }} />
                Enviadas
              </span>
              <span>
                <i style={{ background: "var(--danger)" }} />
                Fallidas
              </span>
            </div>
          </div>
          {stats && stats.byDay.length > 0 ? (
            <TrendChart data={stats.byDay} />
          ) : (
            <div className="empty-state">{stats ? "Sin datos todavía" : ""}</div>
          )}
        </div>
        <div className="card chart-card">
          <div className="chart-card-head">
            <div>
              <h3>Distribución por estado</h3>
              <p className="chart-subtitle">{rangeLabel}</p>
            </div>
          </div>
          {stats && (
            <StatusBreakdown
              segments={[
                { label: "Enviadas", value: stats.sent, color: "var(--chart-bar)" },
                { label: "Fallidas", value: stats.failed, color: "var(--danger)" },
                { label: "Pendientes", value: stats.pending, color: "var(--warning)" },
                { label: "Encoladas", value: stats.queued, color: "var(--info)" },
              ]}
            />
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">
            Historial
            <span className="badge badge-plain num">{formatNumber(total)}</span>
          </h3>
          <div className="toolbar">
            <select
              className={`control${recipientUserId ? " active" : ""}`}
              aria-label="Empleado"
              value={recipientUserId}
              onChange={(e) => {
                setPage(1);
                setRecipientUserId(e.target.value);
              }}
            >
              <option value="">Todos los empleados</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <select
              className={`control${eventTypeId ? " active" : ""}`}
              aria-label="Tipo de evento"
              value={eventTypeId}
              onChange={(e) => {
                setPage(1);
                setEventTypeId(e.target.value);
              }}
            >
              <option value="">Todos los eventos</option>
              {eventTypes.map((et) => (
                <option key={et.id} value={et.id}>
                  {et.name}
                </option>
              ))}
            </select>
            <select
              className={`control${status ? " active" : ""}`}
              aria-label="Estado"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">Cualquier estado</option>
              <option value="PENDING">Pendiente</option>
              <option value="QUEUED">Encolada</option>
              <option value="SENT">Enviada</option>
              <option value="FAILED">Fallida</option>
            </select>
            <span className="date-range">
              <input
                type="date"
                className={`control${from ? " active" : ""}`}
                aria-label="Desde"
                value={from}
                onChange={(e) => {
                  setPage(1);
                  setFrom(e.target.value);
                }}
              />
              –
              <input
                type="date"
                className={`control${to ? " active" : ""}`}
                aria-label="Hasta"
                value={to}
                onChange={(e) => {
                  setPage(1);
                  setTo(e.target.value);
                }}
              />
            </span>
            {hasFilters && (
              <button className="btn btn-sm btn-ghost" onClick={resetFilters}>
                <IconX width={13} height={13} /> Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Destinatario</th>
                <th>Mensaje</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Intentos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const who = n.recipientUser?.name ?? n.recipientEmail;
                return (
                  <tr key={n.id}>
                    <td className="cell-mono">{formatDateTime(n.createdAt)}</td>
                    <td>{n.eventType.name}</td>
                    <td>
                      <div className="person">
                        <span className="avatar">{initials(who)}</span>
                        <span>{who}</span>
                      </div>
                    </td>
                    <td className="wrap">
                      {n.renderedMessage}
                      {n.status === "FAILED" && n.lastError && (
                        <div className="error-text" style={{ marginTop: 4, fontSize: 12 }}>
                          {n.lastError}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="cell-mono" style={{ textAlign: "right" }}>
                      {n.attempts}/{n.maxAttempts}
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <strong>Sin resultados</strong>
                      No hay notificaciones con estos filtros.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footer">
          <span>
            <span className="num">
              {firstRow}–{lastRow}
            </span>{" "}
            de <span className="num">{formatNumber(total)}</span>
          </span>
          <div className="pagination">
            <span>
              Página <span className="num">{page}</span> de <span className="num">{totalPages}</span>
            </span>
            <button
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
            >
              <IconChevronLeft width={14} height={14} />
            </button>
            <button
              className="btn btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
