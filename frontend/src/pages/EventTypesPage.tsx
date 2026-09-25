import { useEffect, useState } from "react";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SIMULATOR_DEMO_PAYLOAD, SIMULATOR_TRIGGER_KEYS } from "../constants";
import { IconPlus } from "../components/icons";
import { roleLabel } from "../format";
import type { Channel, EventType, RecipientRule, Role } from "../types";

type RuleType = RecipientRule["type"];

interface FormState {
  id?: string;
  name: string;
  triggerKey: string;
  description: string;
  ruleType: RuleType;
  ruleRole: Role;
  ruleArea: string;
  messageTemplate: string;
  channel: Channel;
  schedule: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  triggerKey: "",
  description: "",
  ruleType: "ROLE",
  ruleRole: "SUPERVISOR",
  ruleArea: "",
  messageTemplate: "",
  channel: "EMAIL",
  schedule: "",
};

function describeRule(rule: RecipientRule): string {
  switch (rule.type) {
    case "ROLE":
      return `Rol · ${roleLabel(rule.value)}`;
    case "AREA":
      return `Área · ${rule.value}`;
    case "USERS":
      return `${rule.value.length} usuario(s) específico(s)`;
    case "ALL":
      return "Todos los empleados";
  }
}

export function EventTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    api
      .listEventTypes()
      .then((res) => setEventTypes(res.eventTypes))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar tipos de evento"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(et: EventType) {
    setForm({
      id: et.id,
      name: et.name,
      triggerKey: et.triggerKey,
      description: et.description ?? "",
      ruleType: et.recipientRule.type,
      ruleRole: et.recipientRule.type === "ROLE" ? et.recipientRule.value : "SUPERVISOR",
      ruleArea: et.recipientRule.type === "AREA" ? et.recipientRule.value : "",
      messageTemplate: et.messageTemplate,
      channel: et.channel,
      schedule: et.schedule ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  function buildRule(): RecipientRule {
    if (form.ruleType === "ROLE") return { type: "ROLE", value: form.ruleRole };
    if (form.ruleType === "AREA") return { type: "AREA", value: form.ruleArea };
    if (form.ruleType === "ALL") return { type: "ALL" };
    return { type: "USERS", value: [] }; // no se expone edicion de lista puntual de usuarios en este MVP
  }

  async function handleSubmit() {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name,
        triggerKey: form.triggerKey,
        description: form.description || undefined,
        recipientRule: buildRule(),
        messageTemplate: form.messageTemplate,
        channel: form.channel,
        schedule: form.schedule || null,
      };
      if (form.id) {
        await api.updateEventType(form.id, payload);
      } else {
        await api.createEventType(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(et: EventType) {
    if (!confirm(`¿Desactivar "${et.name}"?`)) return;
    await api.deactivateEventType(et.id);
    load();
  }

  async function handleTestTrigger(et: EventType) {
    const idempotencyKey = `panel-test-${et.id}-${Date.now()}`;
    // Para los trigger_key que usa el simulador de planta, se manda un
    // payload de ejemplo realista en vez de vacio — si no, el mensaje
    // renderizado queda con variables {{...}} sin reemplazar.
    const payload = SIMULATOR_DEMO_PAYLOAD[et.triggerKey] ?? {};
    try {
      const res = await api.triggerEvent({ triggerKey: et.triggerKey, idempotencyKey, payload });
      setTriggerFeedback((prev) => ({
        ...prev,
        [et.id]: `Disparado: ${res.notificationsCreated} notificacion(es) creadas.`,
      }));
    } catch (err) {
      setTriggerFeedback((prev) => ({
        ...prev,
        [et.id]: err instanceof ApiError ? err.message : "Error al disparar",
      }));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tipos de evento</h1>
          <p>Qué dispara un aviso, a quién le llega y con qué mensaje.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus width={14} height={14} /> Nuevo tipo de evento
          </button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>trigger_key</th>
              <th>Destinatarios</th>
              <th>Canal</th>
              <th>Programado</th>
              <th>Estado</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {eventTypes.map((et) => (
              <tr key={et.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{et.name}</div>
                </td>
                <td>
                  <code className="key">{et.triggerKey}</code>
                  {SIMULATOR_TRIGGER_KEYS.some((sk) => sk.key === et.triggerKey) && (
                    <span className="badge badge-accent" style={{ marginLeft: 6 }}>
                      Planta
                    </span>
                  )}
                </td>
                <td className="cell-muted">{describeRule(et.recipientRule)}</td>
                <td className="cell-muted">{et.channel === "EMAIL" ? "Email" : "WhatsApp"}</td>
                <td className="cell-mono">{et.schedule ?? "—"}</td>
                <td>
                  <span className={`badge ${et.isActive ? "badge-active" : "badge-inactive"}`}>
                    {et.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="cell-actions">
                    <div className="section-actions">
                      <button className="btn btn-sm" onClick={() => handleTestTrigger(et)}>
                        Probar disparo
                      </button>
                      <button className="btn btn-sm" onClick={() => openEdit(et)}>
                        Editar
                      </button>
                      {et.isActive && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(et)}>
                          Desactivar
                        </button>
                      )}
                    </div>
                    {triggerFeedback[et.id] && (
                      <div className="muted" style={{ marginTop: 6, fontSize: 12, textAlign: "right" }}>
                        {triggerFeedback[et.id]}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && eventTypes.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">No hay tipos de evento todavía.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? "Editar tipo de evento" : "Nuevo tipo de evento"}</h2>
            <div className="form-grid">
              <div className="field">
                <label>Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Clave de disparo</label>
                <input
                  value={form.triggerKey}
                  disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, triggerKey: e.target.value })}
                  placeholder="lote_listo"
                  required
                />
                <span className="hint">En snake_case. Es la que usan la API y los webhooks.</span>
              </div>
              <div className="field">
                <label>Descripción</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Destinatarios</label>
                <select
                  value={form.ruleType}
                  onChange={(e) => setForm({ ...form, ruleType: e.target.value as RuleType })}
                >
                  <option value="ROLE">Por rol</option>
                  <option value="AREA">Por área</option>
                  <option value="ALL">Todos los empleados</option>
                </select>
              </div>
              {form.ruleType === "ROLE" && (
                <div className="field">
                  <label>Rol destinatario</label>
                  <select
                    value={form.ruleRole}
                    onChange={(e) => setForm({ ...form, ruleRole: e.target.value as Role })}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="EMPLEADO">Empleado</option>
                  </select>
                </div>
              )}
              {form.ruleType === "AREA" && (
                <div className="field">
                  <label>Área destinataria</label>
                  <input
                    value={form.ruleArea}
                    onChange={(e) => setForm({ ...form, ruleArea: e.target.value })}
                    placeholder="Moldeo"
                  />
                </div>
              )}
              <div className="field">
                <label>Plantilla del mensaje</label>
                <textarea
                  value={form.messageTemplate}
                  onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
                  placeholder="El lote {{lote_id}} está listo en {{area}}."
                  required
                />
                <span className="hint">Usá {"{{variable}}"} para insertar datos del evento.</span>
              </div>
              <div className="field">
                <label>Canal</label>
                <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp (todavía no disponible)</option>
                </select>
              </div>
              <div className="field">
                <label>Disparo programado</label>
                <input
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="0 8 * * *"
                />
                <span className="hint">
                  Opcional, en formato cron. Ej.: 0 8 * * * dispara todos los días a las 8:00.
                </span>
              </div>
              {formError && <p className="error-text">{formError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
