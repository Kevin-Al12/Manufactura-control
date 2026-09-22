import { useEffect, useState } from "react";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { InventoryItem, PurchaseOrder } from "../types";

const POLL_MS = 5000;

export function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([api.listInventory(), api.listPurchaseOrders()])
      .then(([inventoryRes, purchaseOrdersRes]) => {
        setInventory(inventoryRes.items);
        setPurchaseOrders(purchaseOrdersRes.purchaseOrders);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar el inventario"));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function handleReceivePO(id: string) {
    try {
      await api.receivePurchaseOrder(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo recibir la compra");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p>Materia prima y compras (ERP simulado) — consumida automaticamente por las ordenes de trabajo en Planta</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="section-title" style={{ marginTop: 0 }}>
        Materia prima
      </div>
      {inventory.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">Sin insumos todavia — se crean 3 de ejemplo al iniciar el simulador en Planta.</div>
        </div>
      ) : (
        <div className="machine-grid">
          {inventory.map((item) => {
            const pct = Math.max(0, Math.min(100, Math.round((item.quantity / (item.reorderThreshold * 3)) * 100)));
            const low = item.quantity < item.reorderThreshold;
            return (
              <div key={item.id} className="machine-card">
                <div className="top">
                  <span className="machine-name">{item.name}</span>
                  {low && <span className="status-dot status-DOWN">Bajo</span>}
                </div>
                <div className="machine-area">
                  {item.sku} — umbral {item.reorderThreshold} {item.unit}
                </div>
                <div className="wo-progress" style={{ marginTop: 2, marginBottom: 8 }}>
                  <span
                    className={pct > 0 ? "filled" : ""}
                    style={{ flex: `${pct} 0 0%`, background: low ? "var(--danger)" : undefined }}
                  />
                  <span style={{ flex: `${100 - pct} 0 0%` }} />
                </div>
                <div className="failures">
                  Stock: <strong>{item.quantity}</strong> {item.unit}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">Ordenes de compra</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Cantidad</th>
              <th>Estado</th>
              <th>Creada</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id}>
                <td>
                  {po.inventoryItem.name} <span className="muted">({po.inventoryItem.sku})</span>
                </td>
                <td>
                  {po.quantity} {po.inventoryItem.unit}
                </td>
                <td>
                  <span className={`badge ${po.status === "RECEIVED" ? "badge-active" : "badge-inactive"}`}>
                    {po.status === "RECEIVED" ? "Recibida" : "Pendiente"}
                  </span>
                </td>
                <td>{new Date(po.createdAt).toLocaleString()}</td>
                {isAdmin && (
                  <td>
                    {po.status === "PENDING" && (
                      <button className="btn btn-sm" onClick={() => handleReceivePO(po.id)}>
                        Marcar recibida
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    Sin ordenes de compra — se generan solas cuando el stock de un insumo cae debajo del umbral.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
