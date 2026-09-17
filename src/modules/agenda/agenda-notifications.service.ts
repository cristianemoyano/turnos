import "server-only";
import logger from "@/lib/logger";
import { absoluteUrl } from "@/lib/absolute-url";
import { formatTimeInTz } from "@/lib/format";
import { dateLabelInTz, dateKeyInTz } from "@/lib/tz";
import { emitInAppNotification } from "@/modules/notifications/emit-in-app.service";
import {
  appointmentNotificationPayloadSchema,
  type AppointmentSource,
  type NotificationEventKey,
} from "@/modules/notifications/notification.schema";
import { publishAgendaEvent, type AgendaLiveEventType } from "./agenda-events.hub";

export interface AgendaNotifyAppointmentInput {
  businessId: string;
  actorId: string | null;
  appointmentId: string;
  clientName: string;
  serviceName: string;
  professionalName: string | null;
  startAt: Date;
  timezone: string;
  source: AppointmentSource;
  eventKey: NotificationEventKey;
  liveType: AgendaLiveEventType;
}

async function safely(eventKey: string, businessId: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (err) {
    logger.error({ err, businessId, eventKey }, "agenda notification failed");
  }
}

/**
 * Publish live agenda SSE + fan-out in-app/push. Safe after commit; never throws.
 */
export async function notifyAppointmentEvent(input: AgendaNotifyAppointmentInput): Promise<void> {
  const dateKey = dateKeyInTz(input.startAt, input.timezone);
  publishAgendaEvent(input.businessId, {
    type: input.liveType,
    appointmentId: input.appointmentId,
    dateKeys: [dateKey],
  });

  await safely(input.eventKey, input.businessId, async () => {
    const payload = appointmentNotificationPayloadSchema.parse({
      appointment_id: input.appointmentId,
      client_name: input.clientName || "Cliente",
      service_name: input.serviceName || "Servicio",
      professional_name: input.professionalName,
      start_at: input.startAt.toISOString(),
      date_label: dateLabelInTz(input.startAt, input.timezone),
      time_label: formatTimeInTz(input.startAt, input.timezone),
      source: input.source,
      document_url: absoluteUrl(`/agenda?date=${dateKey}`),
    });

    await emitInAppNotification(
      { eventKey: input.eventKey, payload },
      { businessId: input.businessId, actorId: input.actorId },
    );
  });
}

/** Blocks only need live SSE — no inbox noise for staff's own calendar blocks. */
export function publishBlockChange(
  businessId: string,
  opts: { appointmentId?: string; startAt: Date; timezone: string; removed?: boolean },
): void {
  publishAgendaEvent(businessId, {
    type: "block.changed",
    appointmentId: opts.appointmentId,
    dateKeys: [dateKeyInTz(opts.startAt, opts.timezone)],
  });
}

export function publishAppointmentRemoved(
  businessId: string,
  opts: { appointmentId: string; startAt: Date; timezone: string },
): void {
  publishAgendaEvent(businessId, {
    type: "appointment.removed",
    appointmentId: opts.appointmentId,
    dateKeys: [dateKeyInTz(opts.startAt, opts.timezone)],
  });
}
