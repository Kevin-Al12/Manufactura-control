export interface SendInput {
  to: string;
  message: string;
}

// Contrato comun a todo canal de entrega. Sumar WhatsApp Cloud API en
// fase 2 es implementar esta misma interfaz, no tocar el worker.
export interface NotificationChannel {
  send(input: SendInput): Promise<void>;
}
