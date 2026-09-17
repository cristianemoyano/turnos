import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["in_app", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = ["pending", "sent", "failed", "skipped"] as const;
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_RECIPIENT_KINDS = ["user"] as const;
export type NotificationRecipientKind = (typeof NOTIFICATION_RECIPIENT_KINDS)[number];

/** Canonical agenda notification events for Turnos. */
export const NOTIFICATION_EVENT_KEYS = [
  "agenda.appointment_created",
  "agenda.appointment_confirmed",
  "agenda.appointment_cancelled",
  "agenda.appointment_rescheduled",
] as const;
export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number];

export const NOTIFICATION_TONES = ["info", "warning", "success"] as const;
export type NotificationTone = (typeof NOTIFICATION_TONES)[number];

export const APPOINTMENT_SOURCES = ["staff", "online"] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export const appointmentNotificationPayloadSchema = z.object({
  appointment_id: z.string().uuid(),
  client_name: z.string().min(1),
  service_name: z.string().min(1),
  professional_name: z.string().nullable(),
  start_at: z.string().min(1),
  date_label: z.string().min(1),
  time_label: z.string().min(1),
  source: z.enum(APPOINTMENT_SOURCES),
  document_url: z.string().url(),
});
export type AppointmentNotificationPayload = z.infer<typeof appointmentNotificationPayloadSchema>;

export interface NotificationEventDef {
  key: NotificationEventKey;
  label: string;
  supportedChannels: NotificationChannel[];
  defaultChannels: NotificationChannel[];
  userConfigurable: boolean;
}

export const NOTIFICATION_EVENTS: Record<NotificationEventKey, NotificationEventDef> = {
  "agenda.appointment_created": {
    key: "agenda.appointment_created",
    label: "Turno nuevo",
    supportedChannels: ["in_app", "push"],
    defaultChannels: ["in_app", "push"],
    userConfigurable: true,
  },
  "agenda.appointment_confirmed": {
    key: "agenda.appointment_confirmed",
    label: "Turno confirmado",
    supportedChannels: ["in_app", "push"],
    defaultChannels: ["in_app", "push"],
    userConfigurable: true,
  },
  "agenda.appointment_cancelled": {
    key: "agenda.appointment_cancelled",
    label: "Turno cancelado",
    supportedChannels: ["in_app", "push"],
    defaultChannels: ["in_app", "push"],
    userConfigurable: true,
  },
  "agenda.appointment_rescheduled": {
    key: "agenda.appointment_rescheduled",
    label: "Turno reprogramado",
    supportedChannels: ["in_app", "push"],
    defaultChannels: ["in_app", "push"],
    userConfigurable: true,
  },
};

export const USER_CONFIGURABLE_NOTIFICATION_EVENTS: NotificationEventDef[] =
  NOTIFICATION_EVENT_KEYS.map((key) => NOTIFICATION_EVENTS[key]).filter((e) => e.userConfigurable);

export function isNotificationEventKey(value: string): value is NotificationEventKey {
  return (NOTIFICATION_EVENT_KEYS as readonly string[]).includes(value);
}

export const notificationRecipientSchema = z.object({
  kind: z.literal("user"),
  userId: z.string().uuid(),
});
export type NotificationRecipient = z.infer<typeof notificationRecipientSchema>;

export const emitNotificationSchema = z.object({
  eventKey: z.enum(NOTIFICATION_EVENT_KEYS),
  recipient: notificationRecipientSchema,
  payload: z.record(z.string(), z.unknown()),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
});
export type EmitNotificationInput = z.infer<typeof emitNotificationSchema>;

export interface EmitNotificationResult {
  notification_id: string;
  deliveries: Array<{
    id: string;
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    transport: string | null;
    error: string | null;
  }>;
  status: "sent" | "failed";
}

const booleanQueryParam = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    return v === "true";
  });

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  read: booleanQueryParam,
  event_key: z.enum(NOTIFICATION_EVENT_KEYS).optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
