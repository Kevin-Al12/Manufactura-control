-- Row-Level Security — capa EXTRA de aislamiento a nivel de base de datos.
--
-- La app ya filtra por tenant_id en cada query (ver src/modules/**/*.service.ts).
-- Este script es un endurecimiento opcional recomendado para produccion:
-- si algun query de la aplicacion olvidara el filtro, Postgres igual
-- bloquea el acceso cruzado entre tenants.
--
-- Requiere conectarse con un rol de base de datos que NO sea el dueno de
-- las tablas (el dueno de tabla puede saltarse RLS salvo que se use
-- FORCE ROW LEVEL SECURITY, y ademas los superusuarios siempre la
-- saltan). Por eso no se aplica automaticamente en el flujo de
-- `prisma migrate dev` de desarrollo local.
--
-- Uso sugerido en produccion:
--   1. Crear un rol de aplicacion sin privilegios de superusuario:
--        CREATE ROLE control_operativo_app LOGIN PASSWORD '...';
--        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO control_operativo_app;
--   2. Ejecutar este script conectado como el dueno de las tablas.
--   3. Apuntar DATABASE_URL (en runtime, NO en migraciones) al rol
--      control_operativo_app.
--   4. En cada request, dentro de la misma transaccion/conexion, ejecutar:
--        SELECT set_config('app.current_tenant_id', $tenantId, true);
--      antes de cualquier query (ver src/db/withTenantSession.ts para un
--      ejemplo de wrapper si se decide adoptar esto).

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE event_types FORCE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_event_types ON event_types
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE events FORCE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_events ON events
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE notification_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notification_logs ON notification_logs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
