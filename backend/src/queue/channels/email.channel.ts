import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";
import type { NotificationChannel, SendInput } from "./channel.interface";

function buildTransporter(): Transporter {
  if (env.smtp.host) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }

  // Sin SMTP configurado: "envia" a un transporte que no toca la red,
  // solo genera el JSON del mensaje. Asi el MVP corre local sin
  // credenciales de correo y las notificaciones igual se registran como
  // SENT con su contenido visible en la consola del worker.
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = buildTransporter();
const usingConsoleTransport = !env.smtp.host;

export const emailChannel: NotificationChannel = {
  async send({ to, message }: SendInput) {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: "Notificacion — Control Operativo",
      text: message,
    });

    if (usingConsoleTransport) {
      console.log(`[email:console-transport] para=${to} mensaje="${message}"`);
    } else {
      console.log(`[email] enviado a ${to} (messageId=${info.messageId})`);
    }
  },
};
