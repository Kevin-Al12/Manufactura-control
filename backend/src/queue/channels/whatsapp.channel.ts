import type { NotificationChannel } from "./channel.interface";

// Reservado para fase 2 (WhatsApp Cloud API). El modelo de datos y la
// cola ya soportan este canal (Channel.WHATSAPP, User.phone); falta solo
// implementar el envio aqui. Mientras tanto, si un event_type queda
// configurado con channel=WHATSAPP, sus notificaciones fallan de forma
// controlada (y quedan auditadas) en vez de fingir que se enviaron.
export const whatsappChannel: NotificationChannel = {
  async send() {
    throw new Error("Canal WhatsApp aun no implementado (planeado para fase 2)");
  },
};
