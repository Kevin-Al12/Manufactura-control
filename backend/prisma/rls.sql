-- Row-Level Security — capa EXTRA de aislamiento a nivel de base de datos.
--
-- La app ya filtra por tenant_id en cada query (ver src/modules/**/*.service.ts).
-- Este script es un endurecimiento opcional para produccion: si algun
-- query de la aplicacion olvidara el filtro, Postgres igual bloquea el
-- acceso cruzado entre tenants.
--
-- ESTADO: el script es valido y cubre todas las tablas con tenant_id, pero
-- la app TODAVIA NO fija app.current_tenant_id por request. Si se aplica
-- y se conecta la app con un rol sujeto a RLS, toda query devolvera 0
-- filas. Antes de activarlo en produccion hace falta:
--   1. Un rol de aplicacion sin SUPERUSER ni BYPASSRLS:
--        CREATE ROLE control_operativo_app LOGIN PASSWORD '...';
--        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO control_operativo_app;
--   2. Que cada request corra sus queries dentro de una transaccion que
--      primero ejecute:
--        SELECT set_config('app.current_tenant_id', <tenantId>, true);
--      (por ejemplo, con una extension de Prisma Client que envuelva cada
--      operacion en $transaction).
--   3. Un camino aparte (rol con BYPASSRLS o funcion SECURITY DEFINER) para
--      lo que ocurre ANTES de conocer el tenant: login por slug, busqueda de
--      tenant por API key, y el worker/scheduler, que operan sobre todos
--      los tenants.
--
-- Uso: ejecutar conectado como dueno de las tablas. Es idempotente.
--
-- Nota: tenant_id es TEXT (Prisma String sin @db.Uuid), por eso la
-- comparacion es text = text, sin cast a uuid.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'event_types',
    'events',
    'notifications',
    'notification_logs',
    'machines',
    'machine_status_logs',
    'work_orders',
    'inventory_items',
    'purchase_orders'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant_id'', true)) '
      || 'WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true))',
      t
    );
  END LOOP;
END
$$;
