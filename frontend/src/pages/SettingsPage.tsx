import { useEffect, useState } from "react";
import * as api from "../api/client";
import type { TenantDetail } from "../types";

export function SettingsPage() {
  // La apiKey no vive en la sesion del navegador: se pide aqui, solo para ADMIN.
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getTenant()
      .then((res) => setTenant(res.tenant))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar la configuracion"));
  }, []);

  async function handleRotate() {
    if (!confirm("La API key anterior dejara de funcionar de inmediato. ¿Continuar?")) return;
    setRotating(true);
    try {
      const res = await api.rotateApiKey();
      setTenant(res.tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rotar la API key");
    } finally {
      setRotating(false);
    }
  }

  async function handleCopy() {
    if (!tenant) return;
    await navigator.clipboard.writeText(tenant.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configuracion</h1>
          <p>Datos de la empresa y credenciales para integraciones</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>Empresa</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {tenant?.name} — slug: <code className="key">{tenant?.slug}</code>
        </p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 15, marginTop: 0 }}>API key para webhooks</h2>
        <p className="muted">
          Usala en el header <code>X-API-Key</code> al llamar a{" "}
          <code>POST /api/events/trigger</code> desde un sistema externo (MES, PLC, ERP), sin
          necesidad de un usuario logueado.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>API key actual</label>
            <code className="key">{tenant?.apiKey}</code>
          </div>
          <div className="section-actions">
            <button className="btn btn-sm" onClick={handleCopy} disabled={!tenant}>
              {copied ? "Copiada" : "Copiar"}
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleRotate} disabled={rotating || !tenant}>
              {rotating ? "Rotando..." : "Rotar API key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
