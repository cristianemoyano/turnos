import "server-only";
import { Op, type WhereOptions } from "sequelize";
import logger from "@/lib/logger";
import type { AuthedContext } from "@/lib/api-auth";
import Notification from "./notification.model";
import { IN_APP_EVENT_KEYS, renderInAppContent } from "./in-app-content";
import type { NotificationListQuery, NotificationTone } from "./notification.schema";

export const UNREAD_SNAPSHOT_SIZE = 10;

export interface NotificationListItem {
  id: string;
  event_key: string;
  title: string;
  body: string;
  url: string | null;
  tone: NotificationTone;
  read_at: string | null;
  created_at: string;
}

const LIST_ATTRIBUTES = ["id", "event_key", "payload", "read_at", "created_at"] as const;

function inboxScope(ctx: AuthedContext): Record<string, unknown> {
  return {
    business_id: ctx.businessId,
    recipient_kind: "user",
    recipient_user_id: ctx.userId,
    event_key: { [Op.in]: IN_APP_EVENT_KEYS },
  };
}

function toListItem(row: Notification): NotificationListItem | null {
  const content = renderInAppContent(row.event_key, row.payload);
  if (!content) return null;
  return {
    id: row.id,
    event_key: row.event_key,
    title: content.title,
    body: content.body,
    url: content.url,
    tone: content.tone,
    read_at: row.read_at ? row.read_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  };
}

export async function listUserNotifications(
  query: NotificationListQuery,
  ctx: AuthedContext,
): Promise<{ data: NotificationListItem[]; total: number; page: number; limit: number }> {
  const { page, limit, read, event_key } = query;
  const offset = (page - 1) * limit;

  const eventKeyFilter = event_key
    ? IN_APP_EVENT_KEYS.filter((key) => key === event_key)
    : IN_APP_EVENT_KEYS;

  const where: WhereOptions = {
    ...inboxScope(ctx),
    event_key: { [Op.in]: eventKeyFilter },
    ...(read === true ? { read_at: { [Op.ne]: null } } : {}),
    ...(read === false ? { read_at: null } : {}),
  };

  const { rows, count } = await Notification.findAndCountAll({
    where,
    attributes: [...LIST_ATTRIBUTES],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  const items = rows
    .map(toListItem)
    .filter((item): item is NotificationListItem => item !== null);

  return { data: items, total: count, page, limit };
}

export async function countUnreadNotifications(ctx: AuthedContext): Promise<number> {
  return Notification.count({ where: { ...inboxScope(ctx), read_at: null } });
}

export interface UnreadSnapshot {
  unread_count: number;
  latest: NotificationListItem[];
}

export async function getUnreadSnapshot(ctx: AuthedContext): Promise<UnreadSnapshot> {
  const [unreadCount, rows] = await Promise.all([
    countUnreadNotifications(ctx),
    Notification.findAll({
      where: { ...inboxScope(ctx), read_at: null },
      attributes: [...LIST_ATTRIBUTES],
      order: [["created_at", "DESC"]],
      limit: UNREAD_SNAPSHOT_SIZE,
    }),
  ]);

  const latest = rows
    .map(toListItem)
    .filter((item): item is NotificationListItem => item !== null);

  return { unread_count: unreadCount, latest };
}

export async function markNotificationRead(
  id: string,
  read: boolean,
  ctx: AuthedContext,
): Promise<NotificationListItem> {
  const row = await Notification.findOne({ where: { id, ...inboxScope(ctx) } });
  if (!row) throw new Error("NOTIFICATION_NOT_FOUND");

  await row.update({ read_at: read ? (row.read_at ?? new Date()) : null });

  const item = toListItem(row);
  if (!item) throw new Error("NOTIFICATION_NOT_FOUND");
  return item;
}

export async function markAllNotificationsRead(
  ctx: AuthedContext,
): Promise<{ updated_count: number }> {
  const [updatedCount] = await Notification.update(
    { read_at: new Date() },
    { where: { ...inboxScope(ctx), read_at: null } },
  );
  logger.info(
    { businessId: ctx.businessId, userId: ctx.userId, updatedCount },
    "notifications marked read",
  );
  return { updated_count: updatedCount };
}
