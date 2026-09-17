import "server-only";
import { Op } from "sequelize";
import sequelize from "@/lib/db";
import logger from "@/lib/logger";
import type { AuthedContext } from "@/lib/api-auth";
import NotificationPreference from "./notification-preference.model";
import {
  NOTIFICATION_EVENTS,
  USER_CONFIGURABLE_NOTIFICATION_EVENTS,
  type NotificationChannel,
  type NotificationEventKey,
} from "./notification.schema";
import {
  notificationPreferenceKey,
  type NotificationPreferencesUpdateInput,
} from "./notification-preference.schema";

export interface NotificationPreferenceView {
  event_key: NotificationEventKey;
  label: string;
  channel: NotificationChannel;
  enabled: boolean;
  is_default: boolean;
}

export async function listNotificationPreferences(
  ctx: AuthedContext,
): Promise<NotificationPreferenceView[]> {
  const rows = await NotificationPreference.findAll({
    where: { business_id: ctx.businessId, user_id: ctx.userId },
    attributes: ["event_key", "channel", "enabled"],
  });
  const saved = new Map(
    rows.map((r) => [notificationPreferenceKey(r.event_key, r.channel), r.enabled]),
  );

  const views: NotificationPreferenceView[] = [];
  for (const event of USER_CONFIGURABLE_NOTIFICATION_EVENTS) {
    for (const channel of event.supportedChannels) {
      const stored = saved.get(notificationPreferenceKey(event.key, channel));
      views.push({
        event_key: event.key,
        label: event.label,
        channel,
        enabled: stored ?? event.defaultChannels.includes(channel),
        is_default: stored === undefined,
      });
    }
  }
  return views;
}

export async function updateNotificationPreferences(
  input: NotificationPreferencesUpdateInput,
  ctx: AuthedContext,
): Promise<NotificationPreferenceView[]> {
  for (const pref of input.preferences) {
    const event = NOTIFICATION_EVENTS[pref.event_key];
    if (!event.userConfigurable || !event.supportedChannels.includes(pref.channel)) {
      throw new Error("NOTIFICATION_PREFERENCE_NOT_CONFIGURABLE");
    }
  }

  await sequelize.transaction(async (t) => {
    for (const pref of input.preferences) {
      await NotificationPreference.upsert(
        {
          business_id: ctx.businessId,
          user_id: ctx.userId,
          event_key: pref.event_key,
          channel: pref.channel,
          enabled: pref.enabled,
        },
        {
          transaction: t,
          conflictFields: ["business_id", "user_id", "event_key", "channel"],
        },
      );
    }
  });

  logger.info(
    { businessId: ctx.businessId, userId: ctx.userId, count: input.preferences.length },
    "notification preferences updated",
  );
  return listNotificationPreferences(ctx);
}

export async function resolveEnabledChannels(
  businessId: string,
  userIds: string[],
  eventKey: NotificationEventKey,
): Promise<Map<string, NotificationChannel[]>> {
  const event = NOTIFICATION_EVENTS[eventKey];
  const result = new Map<string, NotificationChannel[]>();
  if (userIds.length === 0) return result;

  const rows = event.userConfigurable
    ? await NotificationPreference.findAll({
        where: {
          business_id: businessId,
          user_id: { [Op.in]: userIds },
          event_key: eventKey,
        },
        attributes: ["user_id", "channel", "enabled"],
      })
    : [];

  const saved = new Map<string, boolean>();
  for (const row of rows) {
    saved.set(`${row.user_id}::${row.channel}`, row.enabled);
  }

  for (const userId of userIds) {
    const channels = event.supportedChannels.filter((channel) => {
      const stored = saved.get(`${userId}::${channel}`);
      return stored ?? event.defaultChannels.includes(channel);
    });
    result.set(userId, channels);
  }
  return result;
}
