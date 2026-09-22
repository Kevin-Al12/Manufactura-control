import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconGrid, IconUsers, IconBolt, IconSettings, IconInbox, IconLogout, IconFactory, IconBox } from "./icons";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Layout() {
  const { user, tenant, logout } = useAuth();
  const isStaffManager = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="mark">CO</div>
          <div className="name">
            Control Operativo
            <small>{tenant?.name}</small>
          </div>
        </div>

        {isStaffManager && (
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconGrid /> Dashboard
          </NavLink>
        )}
        {isStaffManager && (
          <NavLink to="/employees" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconUsers /> Empleados
          </NavLink>
        )}
        {isStaffManager && (
          <NavLink to="/event-types" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconBolt /> Tipos de evento
          </NavLink>
        )}
        {isStaffManager && (
          <NavLink to="/plant" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconFactory /> Planta
          </NavLink>
        )}
        {isStaffManager && (
          <NavLink to="/inventory" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconBox /> Inventario
          </NavLink>
        )}
        {!isStaffManager && (
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconInbox /> Mis notificaciones
          </NavLink>
        )}
        {user?.role === "ADMIN" && (
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <IconSettings /> Configuracion
          </NavLink>
        )}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{user ? initials(user.name) : ""}</div>
            <div>
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={logout} style={{ width: "100%" }}>
            <IconLogout width={14} height={14} /> Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
