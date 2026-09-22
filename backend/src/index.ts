import { createApp } from "./app";
import { env } from "./config/env";
import { initScheduler } from "./queue/scheduler";

const app = createApp();
app.listen(env.port, () => {
  console.log(`Control Operativo API escuchando en http://localhost:${env.port}`);
});

// El scheduler solo registra los cron jobs de event_types con
// disparo programado; la entrega real la hace el worker (proceso aparte,
// `npm run worker`).
initScheduler().catch((err) => console.error("[scheduler] error al inicializar:", err));
