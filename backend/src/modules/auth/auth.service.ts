import { prisma } from "../../db/prisma";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAuthToken } from "../../utils/jwt";
import { generateApiKey } from "../../utils/apiKey";
import { HttpError } from "../../middleware/errorHandler";
import { Role } from "@prisma/client";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface RegisterTenantInput {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function registerTenant(input: RegisterTenantInput) {
  const baseSlug = slugify(input.companyName);
  if (!baseSlug) throw new HttpError(400, "Nombre de empresa invalido");

  // Garantiza slug unico agregando sufijo si ya existe.
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const passwordHash = await hashPassword(input.adminPassword);

  const { tenant, admin } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.companyName, slug, apiKey: generateApiKey() },
    });
    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.adminEmail.toLowerCase().trim(),
        passwordHash,
        name: input.adminName,
        role: Role.ADMIN,
      },
    });
    return { tenant, admin };
  });

  const token = signAuthToken({ userId: admin.id, tenantId: tenant.id, role: admin.role });
  return { token, tenant: publicTenant(tenant), user: sanitizeUser(admin) };
}

export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug.toLowerCase().trim() } });
  if (!tenant || !tenant.isActive) throw new HttpError(401, "Credenciales invalidas");

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: input.email.toLowerCase().trim() } },
  });

  // No revelamos si fue el tenant, el email o el password lo que fallo.
  if (!user || !user.isActive || !user.passwordHash) throw new HttpError(401, "Credenciales invalidas");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Credenciales invalidas");

  const token = signAuthToken({ userId: user.id, tenantId: tenant.id, role: user.role });
  return { token, tenant: publicTenant(tenant), user: sanitizeUser(user) };
}

// Lo que cualquier usuario del tenant puede ver. La apiKey NO va aqui: solo
// un ADMIN la obtiene, via GET /api/tenant.
function publicTenant(tenant: { id: string; name: string; slug: string }) {
  return { id: tenant.id, name: tenant.name, slug: tenant.slug };
}

export async function getCurrentUser(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return sanitizeUser(user);
}

function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
