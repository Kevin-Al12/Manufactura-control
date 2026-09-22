import { Router } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { authenticate } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const authRouter = Router();

const registerSchema = z.object({
  companyName: z.string().min(2),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

authRouter.post("/tenants/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.registerTenant(input);
    res.status(201).json(result);
  } catch (err) {
    next(toHttpError(err));
  }
});

const loginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  } catch (err) {
    next(toHttpError(err));
  }
});

authRouter.get("/auth/me", authenticate, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.auth!.tenantId, req.auth!.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

function toHttpError(err: unknown) {
  if (err instanceof z.ZodError) {
    return new HttpError(400, err.issues.map((i) => i.message).join(", "));
  }
  return err;
}
