import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconPlay, IconStop, IconArrowRight, IconPlus } from "../components/icons";
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
          <p>Máquinas (SCADA) y órdenes de trabajo (MES) simuladas, sin hardware ni sistemas reales conectados.</p>
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
                  ? "Genera fallas de máquina y mueve órdenes de trabajo cada pocos segundos."
                  : "Al iniciarlo crea 3 máquinas de ejemplo y empieza a mover órdenes de trabajo solo."}
              </div>
            </div>
          </div>
          <button
            className={sim?.running ? "btn btn-danger" : "btn btn-primary"}
            onClick={toggleSimulator}
            disabled={toggling}
          >
            {sim?.running ? <IconStop width={13} height={13} /> : <IconPlay width={13} height={13} />}
            {sim?.running ? "Detener simulador" : "Iniciar simulador"}
          </button>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      <div className="panel connections">
        {SIMULATOR_TRIGGER_KEYS.map((sk) => {
          const match = eventTypes.find((et) => et.triggerKey === sk.key);
          const ok = !!match && match.isActive;
          return (
            <div key={sk.key} className="connection">
              <div className="conn-top">
                <code className="key">{sk.key}</code>
                <span className={`badge ${ok ? "badge-active" : "badge-inactive"}`}>
                  {ok ? "Conectado" : match ? "Inactivo" : "Sin configurar"}
                </span>
              </div>
              <div className="conn-source">{sk.source}</div>
              <div className="conn-desc">
                {ok ? (
                  <>Notifica según «{match!.name}»</>
                ) : (
                  <>
                    No va a notificar a nadie. <Link to="/event-types">Configurar</Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title">
        Máquinas
        {machines.length > 0 && <span className="count">{machines.length}</span>}
      </div>
      {machines.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            {isAdmin
              ? "Iniciá el simulador para ver máquinas de ejemplo en acción."
              : "Todavía no hay máquinas registradas."}
          </div>
        </div>
      ) : (
        <div className="machine-grid">
          {machines.map((m) => (
            <div key={m.id} className={`machine-card${m.status === "DOWN" ? " is-down" : ""}`}>
              <div className="top">
                <span className="machine-name">{m.name}</span>
                <span className={`status-dot status-${m.status}`}>{MACHINE_STATUS_LABEL[m.status]}</span>
              </div>
              <div className="machine-area">{m.area ?? "Sin área"}</div>
              <div className="failures">
                Fallas en 24 h <strong className={m.failures24h > 0 ? "hot" : ""}>{m.failures24h}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Órdenes de trabajo</div>
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">
            Activas
            <span className="badge badge-plain num">{openOrders.length}</span>
          </h3>
          {isAdmin && (
            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateOrder();
              }}
            >
              <input
                className="control"
                aria-label="Código de nueva orden"
                value={newOrderCode}
                onChange={(e) => setNewOrderCode(e.target.value)}
                placeholder="Código, ej. OT-2001"
                style={{ width: 170 }}
              />
              <button className="btn btn-sm" type="submit" disabled={creatingOrder || !newOrderCode.trim()}>
                <IconPlus width={13} height={13} /> Crear orden
              </button>
            </form>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Área</th>
                <th>Máquina</th>
                <th style={{ textAlign: "right" }}>Cantidad</th>
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
                    <td className="cell-muted">{o.area ?? "—"}</td>
                    <td>{o.machine?.name ?? "—"}</td>
                    <td className="cell-mono" style={{ textAlign: "right" }}>
                      {o.quantity}
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="wo-progress" title={`Paso ${stepIndex + 1} de ${WO_STEPS.length}`}>
                        {WO_STEPS.map((step, i) => (
                          <span
                            key={step}
                            className={i < stepIndex ? "filled" : i === stepIndex ? "filled current" : ""}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-dot status-${o.status}`}>{WO_STATUS_LABEL[o.status]}</span>
                    </td>
                    {isAdmin && (
                      <td className="cell-actions">
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
                    <div className="empty-state">No hay órdenes activas.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {closedOrders.length > 0 && (
        <>
          <div className="section-title">Finalizadas</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Área</th>
                  <th>Máquina</th>
                  <th style={{ textAlign: "right" }}>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {closedOrders.slice(0, 10).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code className="key">{o.code}</code>
                    </td>
                    <td className="cell-muted">{o.area ?? "—"}</td>
                    <td>{o.machine?.name ?? "—"}</td>
                    <td className="cell-mono" style={{ textAlign: "right" }}>
                      {o.quantity}
                    </td>
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
