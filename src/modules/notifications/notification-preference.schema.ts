import { z } from "zod";
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENT_KEYS } from "./notification.schema";

export function notificationPreferenceKey(eventKey: string, channel: string): string {
  return `${eventKey}::${channel}`;
}

export const notificationPreferencesUpdateSchema = z.object({
  preferences: z
    .array(
      z.object({
        event_key: z.enum(NOTIFICATION_EVENT_KEYS),
        channel: z.enum(NOTIFICATION_CHANNELS),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(40),
});
export type NotificationPreferencesUpdateInput = z.infer<typeof notificationPreferencesUpdateSchema>;
