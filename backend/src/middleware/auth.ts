import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAuthToken, type AuthTokenPayload } from "../utils/jwt";
import { prisma } from "../db/prisma";

export interface TenantAuthContext {
  tenantId: string;
  via: "jwt" | "apiKey";
  userId?: string;
  role?: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      tenantAuth?: TenantAuthContext;
    }
  }
}

/**
 * Extrae tenantId/userId/role SOLO del JWT firmado. Todo el resto del
 * backend debe leer el tenant desde req.auth.tenantId, nunca desde
 * params/body/query — eso es lo que evita que un tenant pueda leer o
 * escribir datos de otro con solo cambiar un id en el payload.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticacion requerido" });
  }

  try {
    const token = header.slice("Bearer ".length);
    req.auth = verifyAuthToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }
}

/**
 * Para endpoints que pueden ser llamados por un usuario logueado (JWT) O
 * por un sistema externo disparando un webhook (X-API-Key, sin usuario).
 * En ambos casos el tenant queda resuelto de una credencial verificada,
 * nunca de un parametro de la request.
 */
export async function authenticateTenant(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAuthToken(header.slice("Bearer ".length));
      req.tenantAuth = { tenantId: payload.tenantId, via: "jwt", userId: payload.userId, role: payload.role };
      return next();
    } catch {
      return res.status(401).json({ error: "Token invalido o expirado" });
    }
  }

  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
    const tenant = await prisma.tenant.findUnique({ where: { apiKey: apiKeyHeader } });
    if (!tenant || !tenant.isActive) {
      return res.status(401).json({ error: "API key invalida" });
    }
    req.tenantAuth = { tenantId: tenant.id, via: "apiKey" };
    return next();
  }

  return res.status(401).json({ error: "Se requiere header Authorization (Bearer) o X-API-Key" });
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Token de autenticacion requerido" });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta accion" });
    }
    next();
  };
}
