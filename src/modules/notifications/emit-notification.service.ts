import "server-only";
import type { Transaction } from "sequelize";
import logger from "@/lib/logger";
import Notification from "./notification.model";
import NotificationDelivery from "./notification-delivery.model";
import {
  emitNotificationSchema,
  type EmitNotificationInput,
  type EmitNotificationResult,
} from "./notification.schema";
import { getChannelAdapter } from "./channels";

export interface EmitNotificationOptions {
  businessId: string;
  actorId: string | null;
  transaction?: Transaction;
}

/**
 * Create a notification and deliver it through the requested channels.
 * Channel failures are recorded on notification_deliveries; only throw when
 * every channel failed with a hard error (push failure after in_app sent is OK).
 */
export async function emitNotification(
  input: EmitNotificationInput,
  options: EmitNotificationOptions,
): Promise<EmitNotificationResult> {
  const parsed = emitNotificationSchema.parse(input);
  const { businessId, actorId, transaction } = options;

  const notification = await Notification.create(
    {
      business_id: businessId,
      event_key: parsed.eventKey,
      actor_id: actorId,
      recipient_kind: "user",
      recipient_user_id: parsed.recipient.userId,
      payload: parsed.payload,
    },
    { transaction },
  );

  const deliveryResults: EmitNotificationResult["deliveries"] = [];

  for (const channel of parsed.channels) {
    const delivery = await NotificationDelivery.create(
      {
        notification_id: notification.id,
        business_id: businessId,
        channel,
        status: "pending",
      },
      { transaction },
    );

    const adapter = getChannelAdapter(channel);
    if (!adapter) {
      await delivery.update(
        { status: "skipped", error: `Canal no implementado: ${channel}` },
        { transaction },
      );
      deliveryResults.push({
        id: delivery.id,
        channel,
        status: "skipped",
        transport: null,
        error: `Canal no implementado: ${channel}`,
      });
      continue;
    }

    const result = await adapter.deliver({ notification, delivery, transaction });
    const deliveredAt = result.status === "sent" ? new Date() : null;

    await delivery.update(
      {
        status: result.status,
        subject: result.subject ?? null,
        body_text: result.body_text ?? null,
        body_html: result.body_html ?? null,
        transport: result.transport ?? null,
        message_id: result.message_id ?? null,
        error: result.error?.slice(0, 1000) ?? null,
        delivered_at: deliveredAt,
      },
      { transaction },
    );

    deliveryResults.push({
      id: delivery.id,
      channel,
      status: result.status,
      transport: result.transport ?? null,
      error: result.error ?? null,
    });
  }

  logger.info(
    {
      businessId,
      notificationId: notification.id,
      eventKey: parsed.eventKey,
      channels: parsed.channels,
    },
    "Notification emitted",
  );

  const status = deliveryResults.some((d) => d.status === "sent") ? "sent" : "failed";
  return {
    notification_id: notification.id,
    deliveries: deliveryResults,
    status,
  };
}
