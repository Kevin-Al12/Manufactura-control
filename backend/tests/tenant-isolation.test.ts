import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";

// Prueba de integracion: requiere DATABASE_URL apuntando a una base
// Postgres con las migraciones aplicadas (ver README). Usa slugs unicos
// por corrida para no chocar con datos existentes y limpia al final.

const app = createApp();
const runId = Date.now();

const createdTenantSlugs: string[] = [];

async function registerTenant(companyName: string) {
  const res = await request(app).post("/api/tenants/register").send({
    companyName,
    adminName: "Admin",
    adminEmail: `admin@${companyName.toLowerCase().replace(/\s+/g, "")}.test`,
    adminPassword: "password123",
  });
  expect(res.status).toBe(201);
  createdTenantSlugs.push(res.body.tenant.slug);
  return res.body as { token: string; tenant: { id: string; slug: string }; user: { id: string } };
}

describe("aislamiento multi-tenant", () => {
  afterAll(async () => {
    // Limpieza: borrar tenants creados por esta corrida (cascada borra users, etc.)
    await prisma.tenant.deleteMany({ where: { slug: { in: createdTenantSlugs } } });
    await prisma.$disconnect();
  });

  it("un tenant no puede leer ni modificar empleados de otro tenant", async () => {
    const tenantA = await registerTenant(`Empresa A ${runId}`);
    const tenantB = await registerTenant(`Empresa B ${runId}`);

    const createRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${tenantA.token}`)
      .send({ email: `empleado@a${runId}.test`, name: "Empleado A" });
    expect(createRes.status).toBe(201);
    const employeeId = createRes.body.user.id;

    // Tenant A ve a su propio empleado sin problema.
    const okRes = await request(app)
      .get(`/api/users/${employeeId}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(okRes.status).toBe(200);

    // Tenant B, con un JWT valido pero de OTRA empresa, no debe poder
    // leer ni modificar ese mismo id.
    const crossReadRes = await request(app)
      .get(`/api/users/${employeeId}`)
      .set("Authorization", `Bearer ${tenantB.token}`);
    expect(crossReadRes.status).toBe(404);

    const crossWriteRes = await request(app)
      .patch(`/api/users/${employeeId}`)
      .set("Authorization", `Bearer ${tenantB.token}`)
      .send({ name: "Hackeado" });
    expect(crossWriteRes.status).toBe(404);

    // Confirma que el nombre no cambio.
    const verifyRes = await request(app)
      .get(`/api/users/${employeeId}`)
      .set("Authorization", `Bearer ${tenantA.token}`);
    expect(verifyRes.body.user.name).toBe("Empleado A");
  });

  it("el login exige tenant + email + password correctos", async () => {
    const tenant = await registerTenant(`Empresa Login ${runId}`);

    const badPassword = await request(app).post("/api/auth/login").send({
      tenantSlug: tenant.tenant.slug,
      email: `admin@empresalogin${runId}.test`,
      password: "incorrecta",
    });
    expect(badPassword.status).toBe(401);

    const wrongTenant = await request(app).post("/api/auth/login").send({
      tenantSlug: "no-existe",
      email: `admin@empresalogin${runId}.test`,
      password: "password123",
    });
    expect(wrongTenant.status).toBe(401);
  });
});
