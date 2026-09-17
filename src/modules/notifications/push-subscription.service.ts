import "server-only";
import logger from "@/lib/logger";
import type { AuthedContext } from "@/lib/api-auth";
import PushSubscription from "./push-subscription.model";
import type { PushSubscribeInput } from "./push-subscription.schema";

const MAX_ACTIVE_SUBSCRIPTIONS_PER_USER = 20;

export async function upsertPushSubscription(
  input: PushSubscribeInput,
  ctx: AuthedContext,
  userAgent: string | null,
): Promise<PushSubscription> {
  const [row] = await PushSubscription.upsert(
    {
      business_id: ctx.businessId,
      user_id: ctx.userId,
      endpoint: input.endpoint,
      p256dh_key: input.keys.p256dh,
      auth_key: input.keys.auth,
      user_agent: userAgent,
    },
    { conflictFields: ["endpoint"], conflictWhere: { deleted_at: null } },
  );
  logger.info(
    { businessId: ctx.businessId, userId: ctx.userId, subscriptionId: row.id },
    "push subscription upserted",
  );
  return row;
}

export async function removePushSubscription(
  endpoint: string,
  ctx: AuthedContext,
): Promise<{ removed: boolean }> {
  const count = await PushSubscription.destroy({
    where: { endpoint, business_id: ctx.businessId, user_id: ctx.userId },
  });
  return { removed: count > 0 };
}

export async function listActivePushSubscriptions(
  businessId: string,
  userId: string,
): Promise<PushSubscription[]> {
  return PushSubscription.findAll({
    where: { business_id: businessId, user_id: userId },
    limit: MAX_ACTIVE_SUBSCRIPTIONS_PER_USER,
  });
}

export async function deactivatePushSubscription(id: string): Promise<void> {
  await PushSubscription.destroy({ where: { id } });
}
