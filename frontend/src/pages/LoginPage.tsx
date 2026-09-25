import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { AuthBrandPanel } from "../components/AuthBrandPanel";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ tenantSlug, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBrandPanel />
      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Ingresá a tu planta</h1>
          <p className="subtitle">Usá el identificador de tu empresa y tu email.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="tenantSlug">Empresa</label>
              <input
                id="tenantSlug"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="acme-manufactura"
                autoComplete="organization"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          <p className="auth-switch">
            ¿Tu empresa todavía no usa Control Operativo? <Link to="/register">Registrala</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
