import { PrismaClient, Role, Channel } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `co_live_${crypto.randomBytes(24).toString("hex")}`;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-manufactura" },
    update: {},
    create: { name: "Acme Manufactura", slug: "acme-manufactura", apiKey: generateApiKey() },
  });

  const passwordHash = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@acme.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@acme.local",
      name: "Admin Acme",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "supervisor.moldeo@acme.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "supervisor.moldeo@acme.local",
      name: "Luis Fernandez",
      role: Role.SUPERVISOR,
      area: "Moldeo",
      shift: "Manana",
      contactChannel: Channel.EMAIL,
    },
  });

  const empleado1 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "operador1@acme.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "operador1@acme.local",
      name: "Maria Gomez",
      role: Role.EMPLEADO,
      area: "Moldeo",
      shift: "Manana",
      contactChannel: Channel.EMAIL,
    },
  });

  const empleado2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "operador2@acme.local" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "operador2@acme.local",
      name: "Carlos Perez",
      role: Role.EMPLEADO,
      area: "Ensamble",
      shift: "Tarde",
      contactChannel: Channel.EMAIL,
    },
  });

  const loteListo = await prisma.eventType.upsert({
    where: { tenantId_triggerKey: { tenantId: tenant.id, triggerKey: "lote_listo" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Lote listo para inspeccion",
      triggerKey: "lote_listo",
      description: "Se dispara cuando un lote de produccion termina el proceso de moldeo.",
      recipientRule: { type: "AREA", value: "Moldeo" },
      messageTemplate: "El lote {{lote_id}} esta listo para inspeccion en el area {{area}}.",
      channel: Channel.EMAIL,
    },
  });

  const fallaMaquina = await prisma.eventType.upsert({
    where: { tenantId_triggerKey: { tenantId: tenant.id, triggerKey: "falla_maquina" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Falla de maquina",
      triggerKey: "falla_maquina",
      description: "Se dispara cuando una maquina reporta una falla durante el turno.",
      recipientRule: { type: "ROLE", value: "SUPERVISOR" },
      messageTemplate: "Alerta: la maquina {{maquina}} reporto una falla ({{detalle}}) en el turno {{turno}}.",
      channel: Channel.EMAIL,
    },
  });

  const stockBajo = await prisma.eventType.upsert({
    where: { tenantId_triggerKey: { tenantId: tenant.id, triggerKey: "stock_bajo" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Stock bajo de materia prima",
      triggerKey: "stock_bajo",
      description: "Se dispara cuando el inventario de un insumo cae debajo del umbral de reposicion (capa ERP simulada).",
      recipientRule: { type: "ROLE", value: "ADMIN" },
      messageTemplate: "Stock bajo de {{insumo}}: quedan {{cantidad_actual}} {{unidad}}. Se genero una orden de compra automatica.",
      channel: Channel.EMAIL,
    },
  });

  console.log("Seed completado:");
  console.log({
    tenant: { id: tenant.id, slug: tenant.slug, apiKey: tenant.apiKey },
    admin: { email: admin.email, password: "admin1234" },
    staff: [supervisor.email, empleado1.email, empleado2.email],
    eventTypes: [loteListo.triggerKey, fallaMaquina.triggerKey, stockBajo.triggerKey],
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
