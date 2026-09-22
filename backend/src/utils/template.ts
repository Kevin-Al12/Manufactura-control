/** Reemplaza {{variable}} en una plantilla. Si falta una variable, deja el placeholder vacio en vez de fallar. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
