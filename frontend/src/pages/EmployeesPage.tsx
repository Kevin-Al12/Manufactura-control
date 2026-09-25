import { useEffect, useState } from "react";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconPlus } from "../components/icons";
import { initials, roleLabel } from "../format";
import type { Channel, Role, User } from "../types";

interface FormState {
  id?: string;
  email: string;
  name: string;
  role: Role;
  area: string;
  shift: string;
  phone: string;
  contactChannel: Channel;
  password: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  name: "",
  role: "EMPLEADO",
  area: "",
  shift: "",
  phone: "",
  contactChannel: "EMAIL",
  password: "",
};

export function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar empleados"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setForm({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      area: u.area ?? "",
      shift: u.shift ?? "",
      phone: u.phone ?? "",
      contactChannel: u.contactChannel,
      password: "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setFormError(null);
    try {
      if (form.id) {
        await api.updateUser(form.id, {
          name: form.name,
          role: form.role,
          area: form.area || undefined,
          shift: form.shift || undefined,
          phone: form.phone || undefined,
          contactChannel: form.contactChannel,
        });
      } else {
        await api.createUser({
          email: form.email,
          name: form.name,
          role: form.role,
          area: form.area || undefined,
          shift: form.shift || undefined,
          phone: form.phone || undefined,
          contactChannel: form.contactChannel,
          password: form.password || undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(u: User) {
    if (!confirm(`¿Dar de baja a ${u.name}?`)) return;
    await api.deactivateUser(u.id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Empleados</h1>
          <p>Quiénes reciben avisos, en qué área y turno.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus width={14} height={14} /> Nuevo empleado
          </button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Área</th>
              <th>Turno</th>
              <th>Estado</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="person">
                    <span className="avatar">{initials(u.name)}</span>
                    <span className="who">
                      {u.name}
                      <small>{u.email}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-role">{roleLabel(u.role)}</span>
                </td>
                <td className="cell-muted">{u.area ?? "—"}</td>
                <td className="cell-muted">{u.shift ?? "—"}</td>
                <td>
                  <span className={`badge ${u.isActive ? "badge-active" : "badge-inactive"}`}>
                    {u.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="cell-actions">
                    <div className="section-actions">
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>
                        Editar
                      </button>
                      {u.isActive && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(u)}>
                          Dar de baja
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">No hay empleados todavía.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? "Editar empleado" : "Nuevo empleado"}</h2>
            <div className="form-grid">
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!form.id}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  <option value="EMPLEADO">Empleado</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Área</label>
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Moldeo"
                />
              </div>
              <div className="field">
                <label>Turno</label>
                <input
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  placeholder="Mañana"
                />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <span className="hint">Para WhatsApp, en la fase 2.</span>
              </div>
              <div className="field">
                <label>Canal de contacto</label>
                <select
                  value={form.contactChannel}
                  onChange={(e) => setForm({ ...form, contactChannel: e.target.value as Channel })}
                >
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp (todavía no disponible)</option>
                </select>
              </div>
              {!form.id && (
                <div className="field">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <span className="hint">Dejala vacía si esta persona no necesita entrar al panel.</span>
                </div>
              )}
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
