import { useEffect, useState } from "react";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../format";
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
          <p>Materia prima y compras del ERP simulado. Las órdenes de trabajo de Planta la consumen solas.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="section-title" style={{ marginTop: 0 }}>
        Materia prima
        {inventory.length > 0 && <span className="count">{inventory.length}</span>}
      </div>
      {inventory.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            Sin insumos todavía. Se crean 3 de ejemplo al iniciar el simulador en Planta.
          </div>
        </div>
      ) : (
        <div className="machine-grid">
          {inventory.map((item) => {
            const pct = Math.max(0, Math.min(100, Math.round((item.quantity / (item.reorderThreshold * 3)) * 100)));
            const low = item.quantity < item.reorderThreshold;
            return (
              <div key={item.id} className={`machine-card${low ? " is-down" : ""}`}>
                <div className="top">
                  <span className="machine-name">{item.name}</span>
                  {low ? (
                    <span className="status-dot status-DOWN">Stock bajo</span>
                  ) : (
                    <span className="status-dot status-RUNNING">OK</span>
                  )}
                </div>
                <div className="machine-area mono" style={{ fontSize: 12 }}>
                  {item.sku}
                </div>
                <div className={`level${low ? " low" : ""}`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="failures">
                  <span>
                    Umbral {item.reorderThreshold} {item.unit}
                  </span>
                  <span>
                    <strong className={low ? "hot" : ""}>{item.quantity}</strong> {item.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="section-title">
        Órdenes de compra
        {purchaseOrders.length > 0 && <span className="count">{purchaseOrders.length}</span>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th style={{ textAlign: "right" }}>Cantidad</th>
              <th>Estado</th>
              <th>Creada</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id}>
                <td>
                  {po.inventoryItem.name}{" "}
                  <span className="muted mono" style={{ fontSize: 12 }}>
                    {po.inventoryItem.sku}
                  </span>
                </td>
                <td className="cell-mono" style={{ textAlign: "right" }}>
                  {po.quantity} {po.inventoryItem.unit}
                </td>
                <td>
                  <span className={`badge ${po.status === "RECEIVED" ? "badge-active" : "badge-PENDING"}`}>
                    {po.status === "RECEIVED" ? "Recibida" : "Pendiente"}
                  </span>
                </td>
                <td className="cell-mono">{formatDateTime(po.createdAt)}</td>
                {isAdmin && (
                  <td className="cell-actions">
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
                    Sin órdenes de compra. Se generan solas cuando el stock de un insumo cae debajo del umbral.
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
