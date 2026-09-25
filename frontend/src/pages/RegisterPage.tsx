import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { AuthBrandPanel } from "../components/AuthBrandPanel";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ companyName, adminName, adminEmail, adminPassword });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel />
      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Registrá tu empresa</h1>
          <p className="subtitle">Creá la cuenta de administrador. Lleva un minuto.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="companyName">Nombre de la empresa</label>
              <input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="adminName">Tu nombre</label>
              <input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="adminEmail">Email</label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="adminPassword">Contraseña</label>
              <input
                id="adminPassword"
                type="password"
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
              <span className="hint">Mínimo 8 caracteres.</span>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear empresa"}
            </button>
          </form>
          <p className="auth-switch">
            ¿Ya tenés cuenta? <Link to="/login">Ingresar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
