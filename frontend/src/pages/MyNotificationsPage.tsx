import { useEffect, useState } from "react";
import * as api from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { IconChevronLeft, IconChevronRight } from "../components/icons";
import { formatDateTime } from "../format";
import type { NotificationItem } from "../types";

export function MyNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getMyNotifications(page)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mis notificaciones</h1>
          <p>Los avisos que te llegaron, del más reciente al más antiguo.</p>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo de evento</th>
                <th>Mensaje</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id}>
                  <td className="cell-mono">{formatDateTime(n.createdAt)}</td>
                  <td>{n.eventType.name}</td>
                  <td className="wrap">{n.renderedMessage}</td>
                  <td>
                    <StatusBadge status={n.status} />
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <strong>Nada por acá</strong>
                      Todavía no tenés notificaciones.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-footer">
          <span>
            <span className="num">{total}</span> notificaciones
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
