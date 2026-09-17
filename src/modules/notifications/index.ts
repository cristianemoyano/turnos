// Notifications module — event emission with in_app + push channels,
// inbox for the notification center, and Web Push subscriptions.

export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_KEYS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_RECIPIENT_KINDS,
  NOTIFICATION_TONES,
  APPOINTMENT_SOURCES,
  USER_CONFIGURABLE_NOTIFICATION_EVENTS,
  appointmentNotificationPayloadSchema,
  emitNotificationSchema,
  isNotificationEventKey,
  notificationListQuerySchema,
  type AppointmentNotificationPayload,
  type AppointmentSource,
  type EmitNotificationInput,
  type EmitNotificationResult,
  type NotificationChannel,
  type NotificationDeliveryStatus,
  type NotificationEventDef,
  type NotificationEventKey,
  type NotificationListQuery,
  type NotificationRecipient,
  type NotificationRecipientKind,
  type NotificationTone,
} from "./notification.schema";

export { emitNotification } from "./emit-notification.service";
export {
  emitInAppNotification,
  type EmitInAppNotificationInput,
  type EmitInAppNotificationOptions,
} from "./emit-in-app.service";

export {
  countUnreadNotifications,
  getUnreadSnapshot,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  UNREAD_SNAPSHOT_SIZE,
  type NotificationListItem,
  type UnreadSnapshot,
} from "./notifications.service";

export {
  listNotificationPreferences,
  resolveEnabledChannels,
  updateNotificationPreferences,
  type NotificationPreferenceView,
} from "./notification-preferences.service";

export {
  notificationPreferenceKey,
  notificationPreferencesUpdateSchema,
  type NotificationPreferencesUpdateInput,
} from "./notification-preference.schema";

export {
  MAX_FANOUT_RECIPIENTS,
  resolveInAppRecipients,
  type InAppRecipient,
} from "./notification-recipients.service";

export { IN_APP_EVENT_KEYS, renderInAppContent, type InAppContent } from "./in-app-content";
export { default as Notification } from "./notification.model";
export { default as NotificationDelivery } from "./notification-delivery.model";
export { default as NotificationPreference } from "./notification-preference.model";

export {
  upsertPushSubscription,
  removePushSubscription,
  listActivePushSubscriptions,
  deactivatePushSubscription,
} from "./push-subscription.service";
export {
  pushSubscribeSchema,
  pushUnsubscribeSchema,
  type PushSubscribeInput,
  type PushUnsubscribeInput,
} from "./push-subscription.schema";
export { default as PushSubscription } from "./push-subscription.model";

export {
  getPublicPushVapidSettings,
  getResolvedPushVapidCredentials,
  isPushVapidReady,
  updatePushVapidSettings,
  generateVapidKeyPair,
  clearPushVapidSettingsCache,
  PushVapidSettingsValidationError,
} from "./push-vapid-settings.service";
export {
  pushVapidSettingsUpdateSchema,
  type PushVapidSettingsUpdateInput,
  type PublicPushVapidSettings,
} from "./push-vapid-settings.schema";

export { default as PlatformSetting } from "./platform-setting.model";
