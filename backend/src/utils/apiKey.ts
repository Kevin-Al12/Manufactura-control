import crypto from "node:crypto";

// Prefijo identifica el tipo de credencial en logs/paneles sin exponer el secreto.
export function generateApiKey(): string {
  return `co_live_${crypto.randomBytes(24).toString("hex")}`;
}
