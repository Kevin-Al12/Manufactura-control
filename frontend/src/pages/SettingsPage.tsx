import { useState } from "react";
import * as api from "../api/client";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { tenant, refreshTenant } = useAuth();
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRotate() {
    if (!confirm("La API key anterior dejara de funcionar de inmediato. ¿Continuar?")) return;
    setRotating(true);
    try {
      await api.rotateApiKey();
      await refreshTenant();
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
            <button className="btn btn-sm" onClick={handleCopy}>
              {copied ? "Copiada" : "Copiar"}
            </button>
            <button className="btn btn-sm btn-danger" onClick={handleRotate} disabled={rotating}>
              {rotating ? "Rotando..." : "Rotar API key"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
