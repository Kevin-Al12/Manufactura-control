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
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticacion requerido" });
  }

  let payload: AuthTokenPayload;
  try {
    payload = verifyAuthToken(header.slice("Bearer ".length));
  } catch {
    return res.status(401).json({ error: "Token invalido o expirado" });
  }

  try {
    const auth = await loadActiveSession(payload);
    if (!auth) return res.status(401).json({ error: "Sesion revocada: el usuario o la empresa ya no estan activos" });
    req.auth = auth;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Un JWT valido no basta: el usuario puede haber sido dado de baja o
 * cambiado de rol despues de emitirse el token. Se relee de la base en
 * cada request y se usa el rol ACTUAL, no el que venia en el token.
 */
async function loadActiveSession(payload: AuthTokenPayload): Promise<AuthTokenPayload | null> {
  const user = await prisma.user.findFirst({
    where: { id: payload.userId, tenantId: payload.tenantId },
    select: { id: true, tenantId: true, role: true, isActive: true, tenant: { select: { isActive: true } } },
  });
  if (!user || !user.isActive || !user.tenant.isActive) return null;
  return { userId: user.id, tenantId: user.tenantId, role: user.role };
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
    let payload: AuthTokenPayload;
    try {
      payload = verifyAuthToken(header.slice("Bearer ".length));
    } catch {
      return res.status(401).json({ error: "Token invalido o expirado" });
    }
    try {
      const auth = await loadActiveSession(payload);
      if (!auth) return res.status(401).json({ error: "Sesion revocada: el usuario o la empresa ya no estan activos" });
      req.auth = auth;
      req.tenantAuth = { tenantId: auth.tenantId, via: "jwt", userId: auth.userId, role: auth.role };
      return next();
    } catch (err) {
      return next(err);
    }
  }

  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { apiKey: apiKeyHeader } });
      if (!tenant || !tenant.isActive) {
        return res.status(401).json({ error: "API key invalida" });
      }
      req.tenantAuth = { tenantId: tenant.id, via: "apiKey" };
      return next();
    } catch (err) {
      return next(err);
    }
  }

  return res.status(401).json({ error: "Se requiere header Authorization (Bearer) o X-API-Key" });
}

/**
 * Para endpoints aceptados por authenticateTenant: la API key (sistema
 * externo) pasa siempre; un usuario logueado solo si tiene uno de los roles.
 */
export function authorizeTenant(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.tenantAuth;
    if (!auth) return res.status(401).json({ error: "Se requiere autenticacion" });
    if (auth.via === "apiKey") return next();
    if (!auth.role || !roles.includes(auth.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta accion" });
    }
    next();
  };
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
