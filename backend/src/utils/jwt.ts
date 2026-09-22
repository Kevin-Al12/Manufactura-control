import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";

export interface AuthTokenPayload {
  userId: string;
  tenantId: string;
  role: Role;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
