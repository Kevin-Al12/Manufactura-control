import { z } from "zod";
import { Role } from "@prisma/client";

// Describe a quien le llega la notificacion cuando se dispara un event_type.
export const recipientRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ROLE"), value: z.nativeEnum(Role) }),
  z.object({ type: z.literal("AREA"), value: z.string().min(1) }),
  z.object({ type: z.literal("USERS"), value: z.array(z.string().uuid()).min(1) }),
  z.object({ type: z.literal("ALL") }),
]);

export type RecipientRule = z.infer<typeof recipientRuleSchema>;
