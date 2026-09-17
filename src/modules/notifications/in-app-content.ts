import {
  appointmentNotificationPayloadSchema,
  type NotificationEventKey,
  type NotificationTone,
} from "./notification.schema";

export interface InAppContent {
  title: string;
  body: string;
  url: string | null;
  tone: NotificationTone;
}

function toRelativePath(absoluteUrl: string): string | null {
  try {
    const url = new URL(absoluteUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return absoluteUrl.startsWith("/") ? absoluteUrl : null;
  }
}

type Resolver = (payload: Record<string, unknown>) => InAppContent | null;

function appointmentBody(d: {
  client_name: string;
  service_name: string;
  professional_name: string | null;
  date_label: string;
  time_label: string;
}): string {
  const pro = d.professional_name ? ` · ${d.professional_name}` : "";
  return `${d.client_name} · ${d.service_name}${pro} · ${d.date_label} ${d.time_label}`;
}

const resolveCreated: Resolver = (payload) => {
  const parsed = appointmentNotificationPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const d = parsed.data;
  const origin = d.source === "online" ? " (online)" : "";
  return {
    title: `Turno nuevo${origin}`,
    body: appointmentBody(d),
    url: toRelativePath(d.document_url),
    tone: "info",
  };
};

const resolveConfirmed: Resolver = (payload) => {
  const parsed = appointmentNotificationPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    title: "Turno confirmado",
    body: appointmentBody(d),
    url: toRelativePath(d.document_url),
    tone: "success",
  };
};

const resolveCancelled: Resolver = (payload) => {
  const parsed = appointmentNotificationPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    title: "Turno cancelado",
    body: appointmentBody(d),
    url: toRelativePath(d.document_url),
    tone: "warning",
  };
};

const resolveRescheduled: Resolver = (payload) => {
  const parsed = appointmentNotificationPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    title: "Turno reprogramado",
    body: appointmentBody(d),
    url: toRelativePath(d.document_url),
    tone: "info",
  };
};

const IN_APP_RESOLVERS: Partial<Record<NotificationEventKey, Resolver>> = {
  "agenda.appointment_created": resolveCreated,
  "agenda.appointment_confirmed": resolveConfirmed,
  "agenda.appointment_cancelled": resolveCancelled,
  "agenda.appointment_rescheduled": resolveRescheduled,
};

export function renderInAppContent(
  eventKey: string,
  payload: Record<string, unknown>,
): InAppContent | null {
  const resolve = IN_APP_RESOLVERS[eventKey as NotificationEventKey];
  if (resolve) return resolve(payload);

  const title = typeof payload.title === "string" ? payload.title : null;
  const body = typeof payload.body === "string" ? payload.body : null;
  if (!title && !body) return null;
  return {
    title: title ?? body!,
    body: title ? (body ?? "") : "",
    url: typeof payload.url === "string" ? toRelativePath(payload.url) : null,
    tone: "info",
  };
}

export const IN_APP_EVENT_KEYS: NotificationEventKey[] = Object.keys(
  IN_APP_RESOLVERS,
) as NotificationEventKey[];
