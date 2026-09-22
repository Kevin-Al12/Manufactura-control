import { Channel } from "@prisma/client";
import type { NotificationChannel } from "./channel.interface";
import { emailChannel } from "./email.channel";
import { whatsappChannel } from "./whatsapp.channel";

const registry: Record<Channel, NotificationChannel> = {
  [Channel.EMAIL]: emailChannel,
  [Channel.WHATSAPP]: whatsappChannel,
};

export function getChannel(channel: Channel): NotificationChannel {
  return registry[channel];
}
