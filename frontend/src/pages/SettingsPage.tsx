import { useState } from "react";
import * as api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { IconCopy, IconRefresh } from "../components/icons";

export function SettingsPage() {
  const { tenant, refreshTenant } = useAuth();
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRotate() {
    if (!confirm("La API key anterior dejará de funcionar de inmediato. ¿Continuar?")) return;
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
          <h1>Configuración</h1>
          <p>Datos de la empresa y credenciales para integraciones.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="setting-card">
          <div className="body">
            <h2>Empresa</h2>
            <p>Así te identifica el sistema. Tus empleados usan el identificador para iniciar sesión.</p>
            <dl className="kv">
              <dt>Nombre</dt>
              <dd>{tenant?.name}</dd>
              <dt>Identificador</dt>
              <dd>
                <code className="key">{tenant?.slug}</code>
              </dd>
            </dl>
          </div>
        </section>

        <section className="setting-card">
          <div className="body">
            <h2>API key para webhooks</h2>
            <p>
              Mandala en el header <code className="key">X-API-Key</code> al llamar a{" "}
              <code className="key">POST /api/events/trigger</code> desde un sistema externo (MES, PLC, ERP). No hace
              falta un usuario logueado.
            </p>
            <div className="key-field">
              <code>{tenant?.apiKey}</code>
              <button className="btn btn-sm" onClick={handleCopy}>
                <IconCopy width={13} height={13} />
                {copied ? "Copiada" : "Copiar"}
              </button>
            </div>
          </div>
          <div className="foot">
            <span>Rotarla invalida la anterior al instante.</span>
            <button className="btn btn-sm btn-danger" onClick={handleRotate} disabled={rotating}>
              <IconRefresh width={13} height={13} />
              {rotating ? "Rotando..." : "Rotar API key"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
