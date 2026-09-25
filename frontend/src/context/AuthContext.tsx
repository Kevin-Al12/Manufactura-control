import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../api/client";
import type { Tenant, User } from "../types";

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (input: { tenantSlug: string; email: string; password: string }) => Promise<void>;
  register: (input: { companyName: string; adminName: string; adminEmail: string; adminPassword: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "co_session";

// La apiKey nunca se guarda en el navegador: la pagina de Configuracion la pide al API cuando la necesita.
function publicTenant(tenant: Tenant): Tenant {
  return { id: tenant.id, name: tenant.name, slug: tenant.slug };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const token = api.getToken();
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored) as { user: User; tenant: Tenant };
        // Sesiones guardadas por versiones anteriores incluian la apiKey: se reescriben sin ella.
        const cleanTenant = publicTenant(parsed.tenant);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: parsed.user, tenant: cleanTenant }));
        setUser(parsed.user);
        setTenant(cleanTenant);
      } catch {
        api.setToken(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  function persist(nextUser: User, nextTenant: Tenant, token: string) {
    const cleanTenant = publicTenant(nextTenant);
    api.setToken(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, tenant: cleanTenant }));
    setUser(nextUser);
    setTenant(cleanTenant);
  }

  const login = useCallback(async (input: { tenantSlug: string; email: string; password: string }) => {
    const res = await api.login(input);
    persist(res.user, res.tenant, res.token);
  }, []);

  const register = useCallback(
    async (input: { companyName: string; adminName: string; adminEmail: string; adminPassword: string }) => {
      const res = await api.registerTenant(input);
      persist(res.user, res.tenant, res.token);
    },
    []
  );

  const logout = useCallback(() => {
    api.setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setTenant(null);
  }, []);

  const value = useMemo(
    () => ({ user, tenant, loading, login, register, logout }),
    [user, tenant, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
