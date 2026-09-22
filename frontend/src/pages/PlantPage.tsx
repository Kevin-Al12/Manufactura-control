import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconPlay, IconStop, IconArrowRight } from "../components/icons";
import { SIMULATOR_TRIGGER_KEYS } from "../constants";
import type { EventType, Machine, SimulatorStatus, WorkOrder, WorkOrderStatus } from "../types";

const POLL_MS = 5000;

const MACHINE_STATUS_LABEL: Record<string, string> = {
  RUNNING: "En marcha",
  IDLE: "Detenida",
  DOWN: "Con falla",
  MAINTENANCE: "Mantenimiento",
};

const WO_STATUS_LABEL: Record<string, string> = {
  CREATED: "Creada",
  IN_PROGRESS: "En proceso",
  READY: "Lista",
  INSPECTED: "Inspeccionada",
  CANCELLED: "Cancelada",
};

const WO_STEPS: WorkOrderStatus[] = ["CREATED", "IN_PROGRESS", "READY", "INSPECTED"];

export function PlantPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [sim, setSim] = useState<SimulatorStatus | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [newOrderCode, setNewOrderCode] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  function load() {
    Promise.all([api.getSimulatorStatus(), api.listMachines(), api.listWorkOrders(), api.listEventTypes()])
      .then(([simRes, machinesRes, ordersRes, eventTypesRes]) => {
        setSim(simRes);
        setMachines(machinesRes.machines);
        setWorkOrders(ordersRes.workOrders);
        setEventTypes(eventTypesRes.eventTypes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar la planta"));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function toggleSimulator() {
    setToggling(true);
    try {
      const res = sim?.running ? await api.stopSimulator() : await api.startSimulator();
      setSim(res);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el simulador");
    } finally {
      setToggling(false);
    }
  }

  async function handleAdvance(id: string) {
    try {
      await api.advanceWorkOrder(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo avanzar la orden");
    }
  }

  async function handleCreateOrder() {
    if (!newOrderCode.trim()) return;
    setCreatingOrder(true);
    try {
      await api.createWorkOrder({ code: newOrderCode.trim() });
      setNewOrderCode("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la orden");
    } finally {
      setCreatingOrder(false);
    }
  }

  const openOrders = workOrders.filter((o) => o.status !== "INSPECTED" && o.status !== "CANCELLED");
  const closedOrders = workOrders.filter((o) => o.status === "INSPECTED" || o.status === "CANCELLED");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Planta</h1>
          <p>Simulacro de maquinas (SCADA) y ordenes de trabajo (MES) — sin hardware ni sistemas reales conectados</p>
        </div>
      </div>

      {isAdmin && (
        <div className="card sim-bar">
          <div className="sim-info">
            <span className={`sim-dot${sim?.running ? " on" : ""}`} />
            <div>
              <div className="sim-title">Simulador {sim?.running ? "corriendo" : "detenido"}</div>
              <div className="sim-subtitle">
                {sim?.running
                  ? "Generando fallas de maquina y ordenes de trabajo automaticamente cada pocos segundos"
                  : "Iniciarlo crea 3 maquinas de ejemplo y empieza a mover ordenes de trabajo solo"}
              </div>
            </div>
          </div>
          <button className={sim?.running ? "btn btn-danger" : "btn btn-primary"} onClick={toggleSimulator} disabled={toggling}>
            {sim?.running ? <IconStop width={13} height={13} /> : <IconPlay width={13} height={13} />}
            {sim?.running ? "Detener simulador" : "Iniciar simulador"}
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13.5, margin: "0 0 10px" }}>Conexión con tipos de evento</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SIMULATOR_TRIGGER_KEYS.map((sk) => {
            const match = eventTypes.find((et) => et.triggerKey === sk.key);
            const ok = !!match && match.isActive;
            return (
              <div key={sk.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span className={`badge ${ok ? "badge-active" : "badge-inactive"}`} style={{ minWidth: 92, justifyContent: "center" }}>
                  {ok ? "Conectado" : match ? "Inactivo" : "Sin configurar"}
                </span>
                <code className="key">{sk.key}</code>
                <span className="muted">
                  {sk.source} → {ok ? `notifica segun "${match!.name}"` : "no va a notificar a nadie"}
                </span>
                {!ok && (
                  <Link to="/event-types" style={{ fontSize: 12 }}>
                    Configurar
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-title">Maquinas</div>
      {machines.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            {isAdmin ? "Iniciá el simulador para ver maquinas de ejemplo en accion." : "Todavia no hay maquinas registradas."}
          </div>
        </div>
      ) : (
        <div className="machine-grid">
          {machines.map((m) => (
            <div key={m.id} className="machine-card">
              <div className="top">
                <span className="machine-name">{m.name}</span>
                <span className={`status-dot status-${m.status}`}>{MACHINE_STATUS_LABEL[m.status]}</span>
              </div>
              <div className="machine-area">{m.area ?? "Sin area"}</div>
              <div className="failures">
                Fallas 24h: <strong>{m.failures24h}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Ordenes de trabajo activas</div>
      {isAdmin && (
        <div className="filters-bar" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Codigo de nueva orden</label>
            <input value={newOrderCode} onChange={(e) => setNewOrderCode(e.target.value)} placeholder="OT-2001" />
          </div>
          <button className="btn btn-sm" onClick={handleCreateOrder} disabled={creatingOrder || !newOrderCode.trim()}>
            + Crear orden manual
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Area</th>
              <th>Maquina</th>
              <th>Cantidad</th>
              <th>Progreso</th>
              <th>Estado</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {openOrders.map((o) => {
              const stepIndex = WO_STEPS.indexOf(o.status);
              return (
                <tr key={o.id}>
                  <td>
                    <code className="key">{o.code}</code>
                  </td>
                  <td>{o.area ?? "-"}</td>
                  <td>{o.machine?.name ?? "-"}</td>
                  <td>{o.quantity}</td>
                  <td style={{ minWidth: 110 }}>
                    <div className="wo-progress">
                      {WO_STEPS.map((step, i) => (
                        <span key={step} className={i <= stepIndex ? "filled" : ""} />
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-dot status-${o.status}`}>{WO_STATUS_LABEL[o.status]}</span>
                  </td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-sm" onClick={() => handleAdvance(o.id)}>
                        Avanzar <IconArrowRight width={12} height={12} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {openOrders.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">No hay ordenes activas.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {closedOrders.length > 0 && (
        <>
          <div className="section-title">Ordenes finalizadas</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Area</th>
                  <th>Maquina</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {closedOrders.slice(0, 10).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code className="key">{o.code}</code>
                    </td>
                    <td>{o.area ?? "-"}</td>
                    <td>{o.machine?.name ?? "-"}</td>
                    <td>{o.quantity}</td>
                    <td>
                      <span className={`status-dot status-${o.status}`}>{WO_STATUS_LABEL[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
