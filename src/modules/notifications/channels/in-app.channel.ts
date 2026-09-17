import "server-only";
import { renderInAppContent } from "../in-app-content";
import type { NotificationChannelAdapter, ChannelDeliveryContext, ChannelDeliveryResult } from "./types";

/**
 * In-app delivery only records rendered content on the delivery row for audit.
 * The inbox re-renders from payload + event_key.
 */
export class InAppChannelAdapter implements NotificationChannelAdapter {
  readonly kind = "in_app" as const;

  async deliver(ctx: ChannelDeliveryContext): Promise<ChannelDeliveryResult> {
    const { notification } = ctx;
    const content = renderInAppContent(notification.event_key, notification.payload);

    if (!content) {
      return { status: "skipped", error: "Payload in-app incompleto" };
    }

    return {
      status: "sent",
      subject: content.title,
      body_text: content.body,
      transport: "internal",
    };
  }
}
