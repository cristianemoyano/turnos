import "server-only";
import webpush from "web-push";
import logger from "@/lib/logger";
import { absoluteUrl } from "@/lib/absolute-url";
import { renderInAppContent } from "../in-app-content";
import { getResolvedPushVapidCredentials } from "../push-vapid-settings.service";
import { listActivePushSubscriptions, deactivatePushSubscription } from "../push-subscription.service";
import type { NotificationChannelAdapter, ChannelDeliveryContext, ChannelDeliveryResult } from "./types";

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export class PushChannelAdapter implements NotificationChannelAdapter {
  readonly kind = "push" as const;

  async deliver(ctx: ChannelDeliveryContext): Promise<ChannelDeliveryResult> {
    const { notification } = ctx;

    const credentials = await getResolvedPushVapidCredentials();
    if (!credentials) {
      return { status: "skipped", error: "VAPID no configurado" };
    }
    webpush.setVapidDetails(
      `mailto:${credentials.contactEmail}`,
      credentials.publicKey,
      credentials.privateKey,
    );

    if (notification.recipient_kind !== "user" || !notification.recipient_user_id) {
      return { status: "skipped", error: "Push sólo soporta destinatarios de tipo user" };
    }

    const content = renderInAppContent(notification.event_key, notification.payload);
    if (!content) {
      return { status: "skipped", error: "Payload sin contenido renderizable para push" };
    }

    const subscriptions = await listActivePushSubscriptions(
      notification.business_id,
      notification.recipient_user_id,
    );
    if (subscriptions.length === 0) {
      return { status: "skipped", error: "El usuario no tiene suscripciones push activas" };
    }

    const payload: PushPayload = {
      title: content.title,
      body: content.body,
      url: content.url ? absoluteUrl(content.url) : absoluteUrl("/agenda"),
    };
    const serialized = JSON.stringify(payload);

    let sentCount = 0;
    const errors: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            serialized,
          );
          sentCount += 1;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await deactivatePushSubscription(sub.id);
            logger.info(
              {
                businessId: notification.business_id,
                notificationId: notification.id,
                subscriptionId: sub.id,
              },
              "push subscription gone (404/410), deactivated",
            );
          } else {
            const message = err instanceof Error ? err.message : "Error desconocido";
            errors.push(message);
            logger.error(
              {
                businessId: notification.business_id,
                notificationId: notification.id,
                subscriptionId: sub.id,
                err: message,
              },
              "push delivery failed",
            );
          }
        }
      }),
    );

    if (sentCount > 0) {
      return { status: "sent", subject: content.title, body_text: content.body, transport: "web-push" };
    }
    return {
      status: "failed",
      subject: content.title,
      body_text: content.body,
      transport: "web-push",
      error: errors.join("; ") || "Todas las suscripciones estaban vencidas",
    };
  }
}
