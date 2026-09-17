import "server-only";
import logger from "@/lib/logger";
import User from "@/modules/business/user.model";
import type { NotificationEventKey } from "./notification.schema";

export const MAX_FANOUT_RECIPIENTS = 50;

export interface InAppRecipient {
  id: string;
  email: string;
}

export interface ResolveInAppRecipientsInput {
  businessId: string;
  eventKey: NotificationEventKey;
  excludeUserId?: string | null;
}

/**
 * All active users of the business except the actor.
 * Turnos has no role/permission matrix yet — every staff user gets agenda events.
 */
export async function resolveInAppRecipients(
  input: ResolveInAppRecipientsInput,
): Promise<InAppRecipient[]> {
  const users = await User.findAll({
    where: { business_id: input.businessId },
    attributes: ["id", "email"],
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"],
    ],
    limit: MAX_FANOUT_RECIPIENTS + 10,
  });

  let allowed = users.filter((u) => u.id !== input.excludeUserId);

  if (allowed.length > MAX_FANOUT_RECIPIENTS) {
    logger.warn(
      {
        businessId: input.businessId,
        eventKey: input.eventKey,
        resolved: allowed.length,
        cap: MAX_FANOUT_RECIPIENTS,
      },
      "notification fan-out truncated",
    );
    allowed = allowed.slice(0, MAX_FANOUT_RECIPIENTS);
  }

  return allowed.map((u) => ({ id: u.id, email: u.email }));
}
