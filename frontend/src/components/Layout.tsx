import { NavLink, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { initials, roleLabel } from "../format";
import {
  IconGrid,
  IconUsers,
  IconBolt,
  IconSettings,
  IconInbox,
  IconLogout,
  IconFactory,
  IconBox,
  IconLogo,
} from "./icons";

const PAGE_TITLES: Record<string, string> = {
  "/employees": "Empleados",
  "/event-types": "Tipos de evento",
  "/plant": "Planta",
  "/inventory": "Inventario",
  "/settings": "Configuración",
};

const TODAY = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      {icon}
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { user, tenant, logout } = useAuth();
  const { pathname } = useLocation();
  const isStaffManager = user?.role === "ADMIN" || user?.role === "SUPERVISOR";
  const homeTitle = isStaffManager ? "Dashboard" : "Mis notificaciones";
  const currentTitle = PAGE_TITLES[pathname] ?? homeTitle;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <IconLogo width={15} height={15} />
          </div>
          <div className="name">
            Control Operativo
            <small>{tenant?.name}</small>
          </div>
        </div>

        {isStaffManager ? (
          <>
            <nav className="nav-group">
              <div className="nav-group-label">Operación</div>
              <NavItem to="/" icon={<IconGrid />}>
                Dashboard
              </NavItem>
              <NavItem to="/plant" icon={<IconFactory />}>
                Planta
              </NavItem>
              <NavItem to="/inventory" icon={<IconBox />}>
                Inventario
              </NavItem>
            </nav>
            <nav className="nav-group">
              <div className="nav-group-label">Gestión</div>
              <NavItem to="/event-types" icon={<IconBolt />}>
                Tipos de evento
              </NavItem>
              <NavItem to="/employees" icon={<IconUsers />}>
                Empleados
              </NavItem>
              {user?.role === "ADMIN" && (
                <NavItem to="/settings" icon={<IconSettings />}>
                  Configuración
                </NavItem>
              )}
            </nav>
          </>
        ) : (
          <nav className="nav-group">
            <NavItem to="/" icon={<IconInbox />}>
              Mis notificaciones
            </NavItem>
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{user ? initials(user.name) : ""}</div>
            <div style={{ minWidth: 0 }}>
              <div className="name">{user?.name}</div>
              <div className="role">{user ? roleLabel(user.role) : ""}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <IconLogout width={16} height={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            <span>{tenant?.name}</span>
            <span className="sep">/</span>
            <span className="current">{currentTitle}</span>
          </div>
          <span className="live-pill">{TODAY}</span>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
