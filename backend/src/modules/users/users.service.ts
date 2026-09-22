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

export async function createUser(tenantId: string, input: CreateUserInput) {
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

export async function updateUser(tenantId: string, userId: string, input: UpdateUserInput) {
  // updateMany en vez de update: si el id no pertenece al tenant, count=0
  // en vez de mutar una fila de otra empresa.
  const result = await prisma.user.updateMany({
    where: { id: userId, tenantId },
    data: input,
  });
  if (result.count === 0) throw new HttpError(404, "Usuario no encontrado");
  return getUser(tenantId, userId);
}

export async function deactivateUser(tenantId: string, userId: string) {
  return updateUser(tenantId, userId, { isActive: false });
}

function sanitize<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
