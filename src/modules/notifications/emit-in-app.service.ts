import "server-only";
import logger from "@/lib/logger";
import { emitNotification } from "./emit-notification.service";
import { resolveEnabledChannels } from "./notification-preferences.service";
import { resolveInAppRecipients } from "./notification-recipients.service";
import type { NotificationEventKey } from "./notification.schema";

export interface EmitInAppNotificationInput {
  eventKey: NotificationEventKey;
  payload: Record<string, unknown>;
}

export interface EmitInAppNotificationOptions {
  businessId: string;
  /** Author of the action; excluded from fan-out. `null` for public booking / confirm. */
  actorId: string | null;
}

/**
 * Fan-out an event to business users. Call **after** the business transaction commits.
 * Never throws to the caller — a notification must not undo an appointment.
 */
export async function emitInAppNotification(
  input: EmitInAppNotificationInput,
  options: EmitInAppNotificationOptions,
): Promise<{ emitted_count: number }> {
  const recipients = await resolveInAppRecipients({
    businessId: options.businessId,
    eventKey: input.eventKey,
    excludeUserId: options.actorId,
  });
  if (recipients.length === 0) return { emitted_count: 0 };

  const channelsByUser = await resolveEnabledChannels(
    options.businessId,
    recipients.map((r) => r.id),
    input.eventKey,
  );

  let emitted = 0;
  for (const recipient of recipients) {
    const channels = channelsByUser.get(recipient.id) ?? [];
    if (channels.length === 0) continue;

    try {
      await emitNotification(
        {
          eventKey: input.eventKey,
          recipient: { kind: "user", userId: recipient.id },
          payload: input.payload,
          channels,
        },
        { businessId: options.businessId, actorId: options.actorId },
      );
      emitted += 1;
    } catch (err) {
      logger.error(
        {
          err,
          businessId: options.businessId,
          eventKey: input.eventKey,
          recipientId: recipient.id,
        },
        "in-app notification delivery failed",
      );
    }
  }

  logger.info(
    {
      businessId: options.businessId,
      eventKey: input.eventKey,
      recipients: recipients.length,
      emitted,
    },
    "in-app notification fan-out completed",
  );
  return { emitted_count: emitted };
}
