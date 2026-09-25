import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";

// Prueba de integracion: requiere DATABASE_URL apuntando a una base
// Postgres con las migraciones aplicadas.

const app = createApp();
const runId = Date.now();
const createdTenantSlugs: string[] = [];

async function setupTenant() {
  const companyName = `Fabrica Idempotencia ${runId}`;
  const registerRes = await request(app).post("/api/tenants/register").send({
    companyName,
    adminName: "Admin",
    adminEmail: `admin@idem${runId}.test`,
    adminPassword: "password123",
  });
  expect(registerRes.status).toBe(201);
  createdTenantSlugs.push(registerRes.body.tenant.slug);
  const token = registerRes.body.token as string;

  const eventTypeRes = await request(app)
    .post("/api/event-types")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Lote listo",
      triggerKey: "lote_listo",
      recipientRule: { type: "ROLE", value: "ADMIN" },
      messageTemplate: "El lote {{lote_id}} esta listo.",
    });
  expect(eventTypeRes.status).toBe(201);

  return { token };
}

describe("anti-duplicacion de notificaciones", () => {
  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { in: createdTenantSlugs } } });
    await prisma.$disconnect();
  });

  it("disparar el mismo evento dos veces con la misma idempotencyKey NO genera una segunda notificacion", async () => {
    const { token } = await setupTenant();
    const idempotencyKey = `lote-102-${runId}`;

    const first = await request(app)
      .post("/api/events/trigger")
      .set("Authorization", `Bearer ${token}`)
      .send({ triggerKey: "lote_listo", idempotencyKey, payload: { lote_id: "L-102" } });
    expect(first.status).toBe(201);
    expect(first.body.duplicate).toBe(false);
    expect(first.body.notificationsCreated).toBe(1); // 1 admin como destinatario

    const second = await request(app)
      .post("/api/events/trigger")
      .set("Authorization", `Bearer ${token}`)
      .send({ triggerKey: "lote_listo", idempotencyKey, payload: { lote_id: "L-102" } });
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.eventId).toBe(first.body.eventId);
    expect(second.body.notificationsCreated).toBe(0);

    // Verificacion directa contra la base: sigue habiendo un solo Event y
    // una sola Notification para esta idempotencyKey, sin importar
    // cuantas veces se llamo al endpoint.
    const events = await prisma.event.findMany({ where: { idempotencyKey } });
    expect(events).toHaveLength(1);

    const notifications = await prisma.notification.findMany({ where: { eventId: events[0]!.id } });
    expect(notifications).toHaveLength(1);
  });

  it("dos eventos con idempotencyKey distinta SI generan dos notificaciones", async () => {
    const { token } = await setupTenant();

    const first = await request(app)
      .post("/api/events/trigger")
      .set("Authorization", `Bearer ${token}`)
      .send({ triggerKey: "lote_listo", idempotencyKey: `lote-a-${runId}`, payload: { lote_id: "A" } });
    const second = await request(app)
      .post("/api/events/trigger")
      .set("Authorization", `Bearer ${token}`)
      .send({ triggerKey: "lote_listo", idempotencyKey: `lote-b-${runId}`, payload: { lote_id: "B" } });

    expect(first.body.duplicate).toBe(false);
    expect(second.body.duplicate).toBe(false);
    expect(first.body.eventId).not.toBe(second.body.eventId);
  });
});
