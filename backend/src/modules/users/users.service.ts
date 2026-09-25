import { prisma } from "../../db/prisma";
import { hashPassword } from "../../utils/password";
import { HttpError } from "../../middleware/errorHandler";
import { Channel, Role } from "@prisma/client";

// Cada funcion exige tenantId de forma explicita y lo usa en el where.
// Es la regla de oro del aislamiento: ninguna consulta a "users" sale de
// aqui sin tenantId.

export interface CreateUserInput {
  email: string;
  name: string;
  role?: Role;
  area?: string;
  shift?: string;
  phone?: string;
  contactChannel?: Channel;
  password?: string; // opcional: si no se manda, el usuario solo recibe notificaciones, no puede loguear
}

/** Quien hace la accion. Un SUPERVISOR solo gestiona EMPLEADOS; asignar roles es cosa del ADMIN. */
export interface Actor {
  userId: string;
  role: Role;
}

export async function createUser(tenantId: string, input: CreateUserInput, actor: Actor) {
  if (actor.role !== Role.ADMIN && input.role && input.role !== Role.EMPLEADO) {
    throw new HttpError(403, "Solo un administrador puede crear usuarios con rol ADMIN o SUPERVISOR");
  }

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: input.email.toLowerCase().trim() } },
  });
  if (existing) throw new HttpError(409, "Ya existe un usuario con ese email en la empresa");

  const passwordHash = input.password ? await hashPassword(input.password) : null;

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.email.toLowerCase().trim(),
      name: input.name,
      role: input.role ?? Role.EMPLEADO,
      area: input.area,
      shift: input.shift,
      phone: input.phone,
      contactChannel: input.contactChannel ?? Channel.EMAIL,
      passwordHash,
    },
  });
  return sanitize(user);
}

export interface ListUsersFilter {
  role?: Role;
  area?: string;
  isActive?: boolean;
}

export async function listUsers(tenantId: string, filter: ListUsersFilter = {}) {
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.area ? { area: filter.area } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return users.map(sanitize);
}

export async function getUser(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return sanitize(user);
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  area?: string;
  shift?: string;
  phone?: string;
  contactChannel?: Channel;
  isActive?: boolean;
}

export async function updateUser(tenantId: string, userId: string, input: UpdateUserInput, actor: Actor) {
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { role: true } });
  if (!target) throw new HttpError(404, "Usuario no encontrado");

  if (actor.role !== Role.ADMIN) {
    if (target.role !== Role.EMPLEADO) {
      throw new HttpError(403, "Un supervisor solo puede editar empleados");
    }
    if (input.role !== undefined && input.role !== Role.EMPLEADO) {
      throw new HttpError(403, "Solo un administrador puede cambiar roles");
    }
  }

  // Evita que alguien se deje sin acceso a si mismo por accidente.
  if (userId === actor.userId && ((input.role !== undefined && input.role !== actor.role) || input.isActive === false)) {
    throw new HttpError(400, "No puedes cambiar tu propio rol ni darte de baja");
  }

  // updateMany en vez de update: si el id no pertenece al tenant, count=0
  // en vez de mutar una fila de otra empresa.
  const result = await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: input,
  });
  if (result.count === 0) throw new HttpError(404, "Usuario no encontrado");
  return getUser(tenantId, userId);
}

export async function deactivateUser(tenantId: string, userId: string, actor: Actor) {
  return updateUser(tenantId, userId, { isActive: false }, actor);
}

function sanitize<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
