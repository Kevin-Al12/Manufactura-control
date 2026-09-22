// Trigger keys que el simulador de planta (backend/src/simulator) dispara
// por codigo. Viven acá para que Planta y Tipos de evento muestren el
// mismo estado de conexión sin duplicar la lista.
export const SIMULATOR_TRIGGER_KEYS = [
  { key: "falla_maquina", label: "Falla de maquina", source: "Maquinas (SCADA)" },
  { key: "lote_listo", label: "Lote listo", source: "Ordenes de trabajo (MES)" },
  { key: "stock_bajo", label: "Stock bajo", source: "Inventario (ERP)" },
] as const;

// Payload de ejemplo para el boton "Probar disparo" de event_types que
// coinciden con un trigger key del simulador — sin esto, el mensaje
// renderizado queda con variables {{...}} vacías y parece roto.
export const SIMULATOR_DEMO_PAYLOAD: Record<string, Record<string, unknown>> = {
  falla_maquina: { maquina: "Inyectora-1", detalle: "prueba manual", turno: "Manana", orden_afectada: "" },
  lote_listo: { lote_id: "OT-DEMO", area: "Moldeo" },
  stock_bajo: { insumo: "Resina PP", cantidad_actual: 40, unidad: "kg" },
};
