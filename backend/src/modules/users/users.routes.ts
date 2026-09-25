import { Router, type Request } from "express";
import { z } from "zod";
import { Channel, Role } from "@prisma/client";
import * as usersService from "./users.service";
import { authenticate, authorize } from "../../middleware/auth";
import { HttpError } from "../../middleware/errorHandler";

export const usersRouter = Router();
usersRouter.use(authenticate);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.nativeEnum(Role).optional(),
  area: z.string().optional(),
  shift: z.string().optional(),
  phone: z.string().optional(),
  contactChannel: z.nativeEnum(Channel).optional(),
  password: z.string().min(8).optional(),
});

usersRouter.post("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const user = await usersService.createUser(req.auth!.tenantId, input, actorOf(req));
    res.status(201).json({ user });
  } catch (err) {
    next(toHttpError(err));
  }
});

usersRouter.get("/", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const { role, area, isActive } = req.query;
    const users = await usersService.listUsers(req.auth!.tenantId, {
      role: typeof role === "string" ? (role as Role) : undefined,
      area: typeof area === "string" ? area : undefined,
      isActive: isActive === undefined ? undefined : isActive === "true",
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const user = await usersService.getUser(req.auth!.tenantId, req.params.id!);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  area: z.string().optional(),
  shift: z.string().optional(),
  phone: z.string().optional(),
  contactChannel: z.nativeEnum(Channel).optional(),
  isActive: z.boolean().optional(),
});

usersRouter.patch("/:id", authorize(Role.ADMIN, Role.SUPERVISOR), async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const user = await usersService.updateUser(req.auth!.tenantId, req.params.id!, input, actorOf(req));
    res.json({ user });
  } catch (err) {
    next(toHttpError(err));
  }
});

// "Baja" de empleado: baja logica (isActive=false), preserva historial de notificaciones.
usersRouter.delete("/:id", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const user = await usersService.deactivateUser(req.auth!.tenantId, req.params.id!, actorOf(req));
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

function actorOf(req: Request): usersService.Actor {
  return { userId: req.auth!.userId, role: req.auth!.role };
}
