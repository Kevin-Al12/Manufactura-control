// Formatos compartidos por las tablas del panel. Fechas compactas en
// es-AR ("24 sep, 14:32") en lugar del toLocaleString completo, que
// ocupa media columna.

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dayLabel = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

export function formatDay(isoDate: string): string {
  return dayLabel.format(new Date(isoDate + "T00:00:00Z")).replace(/\./g, "");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("es-AR");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", SUPERVISOR: "Supervisor", EMPLEADO: "Empleado" };

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}
