import { useEffect, useState } from "react";
import * as api from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
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
          <p>Historial de avisos que te llegaron</p>
        </div>
      </div>

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
                <td>{new Date(n.createdAt).toLocaleString()}</td>
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
                  <div className="empty-state">Todavia no tenes notificaciones.</div>
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
          Pagina {page} de {totalPages}
        </span>
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
