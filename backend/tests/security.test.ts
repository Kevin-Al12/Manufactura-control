import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";
import { requeueStale } from "../src/queue/worker";

// Prueba de integracion: requiere DATABASE_URL apuntando a una base
// Postgres con las migraciones aplicadas.

const app = createApp();
const runId = Date.now();
const createdTenantSlugs: string[] = [];
const PASSWORD = "password123";

async function registerTenant(label: string) {
  const res = await request(app).post("/api/tenants/register").send({
    companyName: `Seguridad ${label} ${runId}`,
    adminName: "Admin",
    adminEmail: `admin@${label}${runId}.test`,
    adminPassword: PASSWORD,
  });
  expect(res.status).toBe(201);
  createdTenantSlugs.push(res.body.tenant.slug);
  return res.body as { token: string; tenant: Record<string, unknown> & { slug: string }; user: { id: string } };
}

async function createAndLogin(adminToken: string, slug: string, email: string, role: "SUPERVISOR" | "EMPLEADO") {
  const created = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ email, name: `Usuario ${role}`, role, password: PASSWORD });
  expect(created.status).toBe(201);
  const login = await request(app).post("/api/auth/login").send({ tenantSlug: slug, email, password: PASSWORD });
  expect(login.status).toBe(200);
  return { id: created.body.user.id as string, token: login.body.token as string, loginBody: login.body };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("seguridad", () => {
  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { in: createdTenantSlugs } } });
    await prisma.$disconnect();
  });

  it("login y registro no devuelven la API key; solo el ADMIN la obtiene", async () => {
    const t = await registerTenant("apikey");
    expect(t.tenant).not.toHaveProperty("apiKey");

    const emp = await createAndLogin(t.token, t.tenant.slug, `emp@apikey${runId}.test`, "EMPLEADO");
    expect(emp.loginBody.tenant).not.toHaveProperty("apiKey");

    const asEmployee = await request(app).get("/api/tenant").set(auth(emp.token));
    expect(asEmployee.status).toBe(403);

    const asAdmin = await request(app).get("/api/tenant").set(auth(t.token));
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.tenant.apiKey).toMatch(/^co_live_/);
  });

  it("un SUPERVISOR no puede crear admins, cambiar roles ni editar a otros supervisores", async () => {
    const t = await registerTenant("roles");
    const sup = await createAndLogin(t.token, t.tenant.slug, `sup@roles${runId}.test`, "SUPERVISOR");

    const createAdmin = await request(app)
      .post("/api/users")
      .set(auth(sup.token))
      .send({ email: `nuevo-admin@roles${runId}.test`, name: "Intruso", role: "ADMIN", password: PASSWORD });
    expect(createAdmin.status).toBe(403);

    const promoteSelf = await request(app).patch(`/api/users/${sup.id}`).set(auth(sup.token)).send({ role: "ADMIN" });
    expect(promoteSelf.status).toBe(403);

    const touchAdmin = await request(app).patch(`/api/users/${t.user.id}`).set(auth(sup.token)).send({ isActive: false });
    expect(touchAdmin.status).toBe(403);

    // Lo que si puede hacer: gestionar empleados.
    const createEmployee = await request(app)
      .post("/api/users")
      .set(auth(sup.token))
      .send({ email: `emp@roles${runId}.test`, name: "Empleado" });
    expect(createEmployee.status).toBe(201);
    expect(createEmployee.body.user.role).toBe("EMPLEADO");

    const promoteEmployee = await request(app)
      .patch(`/api/users/${createEmployee.body.user.id}`)
      .set(auth(sup.token))
      .send({ role: "SUPERVISOR" });
    expect(promoteEmployee.status).toBe(403);

    // El ADMIN si puede cambiar roles.
    const adminPromotes = await request(app)
      .patch(`/api/users/${createEmployee.body.user.id}`)
      .set(auth(t.token))
      .send({ role: "SUPERVISOR" });
    expect(adminPromotes.status).toBe(200);
  });

  it("un usuario dado de baja pierde el acceso de inmediato, aunque su token no haya expirado", async () => {
    const t = await registerTenant("baja");
    const sup = await createAndLogin(t.token, t.tenant.slug, `sup@baja${runId}.test`, "SUPERVISOR");

    expect((await request(app).get("/api/users").set(auth(sup.token))).status).toBe(200);

    const deactivate = await request(app).delete(`/api/users/${sup.id}`).set(auth(t.token));
    expect(deactivate.status).toBe(200);

    expect((await request(app).get("/api/users").set(auth(sup.token))).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set(auth(sup.token))).status).toBe(401);
  });

  it("un cambio de rol aplica sin esperar a que el token expire", async () => {
    const t = await registerTenant("degradado");
    const sup = await createAndLogin(t.token, t.tenant.slug, `sup@degradado${runId}.test`, "SUPERVISOR");
    expect((await request(app).get("/api/users").set(auth(sup.token))).status).toBe(200);

    await request(app).patch(`/api/users/${sup.id}`).set(auth(t.token)).send({ role: "EMPLEADO" }).expect(200);

    expect((await request(app).get("/api/users").set(auth(sup.token))).status).toBe(403);
  });

  it("un EMPLEADO no puede disparar eventos; la API key y el ADMIN si", async () => {
    const t = await registerTenant("trigger");
    await request(app)
      .post("/api/event-types")
      .set(auth(t.token))
      .send({ name: "Aviso", triggerKey: "aviso", recipientRule: { type: "ALL" }, messageTemplate: "Hola {{nombre}}" })
      .expect(201);
    const emp = await createAndLogin(t.token, t.tenant.slug, `emp@trigger${runId}.test`, "EMPLEADO");

    const asEmployee = await request(app)
      .post("/api/events/trigger")
      .set(auth(emp.token))
      .send({ triggerKey: "aviso", idempotencyKey: `emp-${runId}` });
    expect(asEmployee.status).toBe(403);

    const asAdmin = await request(app)
      .post("/api/events/trigger")
      .set(auth(t.token))
      .send({ triggerKey: "aviso", idempotencyKey: `admin-${runId}` });
    expect(asAdmin.status).toBe(201);
    expect(asAdmin.body.notificationsCreated).toBe(2); // admin + empleado

    const apiKey = (await request(app).get("/api/tenant").set(auth(t.token))).body.tenant.apiKey as string;
    const viaWebhook = await request(app)
      .post("/api/events/trigger")
      .set("X-API-Key", apiKey)
      .send({ triggerKey: "aviso", idempotencyKey: `webhook-${runId}` });
    expect(viaWebhook.status).toBe(201);

    // Cada notificacion creada tiene su log inicial (se escriben en la misma transaccion).
    const notifications = await prisma.notification.findMany({
      where: { eventId: asAdmin.body.eventId },
      include: { logs: true },
    });
    expect(notifications).toHaveLength(2);
    for (const n of notifications) expect(n.logs).toHaveLength(1);
  });

  it("las notificaciones atascadas en QUEUED vuelven a PENDING", async () => {
    const t = await registerTenant("reaper");
    await request(app)
      .post("/api/event-types")
      .set(auth(t.token))
      .send({ name: "Aviso", triggerKey: "aviso", recipientRule: { type: "ALL" }, messageTemplate: "Hola" })
      .expect(201);
    const trigger = await request(app)
      .post("/api/events/trigger")
      .set(auth(t.token))
      .send({ triggerKey: "aviso", idempotencyKey: `reaper-${runId}` })
      .expect(201);

    // Simula un worker que tomo la fila hace 10 minutos y murio sin resolverla.
    await prisma.notification.updateMany({
      where: { eventId: trigger.body.eventId },
      data: { status: "QUEUED", queuedAt: new Date(Date.now() - 10 * 60_000) },
    });

    await requeueStale();

    const after = await prisma.notification.findMany({ where: { eventId: trigger.body.eventId }, include: { logs: true } });
    expect(after).toHaveLength(1);
    expect(after[0]!.status).toBe("PENDING");
    expect(after[0]!.logs.some((l) => l.message?.includes("QUEUED"))).toBe(true);
  });

  it("el script RLS se aplica sin errores (dentro de una transaccion que se revierte)", async () => {
    const sql = readFileSync(path.join(__dirname, "../prisma/rls.sql"), "utf8");
    const rollback = new Error("rollback intencional");
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(sql);
        const policies = await tx.$queryRaw<{ count: bigint }[]>`
          SELECT count(*)::bigint AS count FROM pg_policies WHERE policyname = 'tenant_isolation'
        `;
        expect(Number(policies[0]!.count)).toBe(10);
        throw rollback;
      })
    ).rejects.toBe(rollback);
  });
});
