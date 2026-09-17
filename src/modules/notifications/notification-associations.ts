import Notification from "./notification.model";
import NotificationDelivery from "./notification-delivery.model";
import NotificationPreference from "./notification-preference.model";
import PushSubscription from "./push-subscription.model";
import User from "@/modules/business/user.model";
import Business from "@/modules/business/business.model";

Notification.belongsTo(Business, { foreignKey: "business_id", as: "business" });
Notification.belongsTo(User, { foreignKey: "recipient_user_id", as: "recipientUser" });
Notification.belongsTo(User, { foreignKey: "actor_id", as: "actor" });
Notification.hasMany(NotificationDelivery, { foreignKey: "notification_id", as: "deliveries" });
NotificationDelivery.belongsTo(Notification, { foreignKey: "notification_id", as: "notification" });

NotificationPreference.belongsTo(Business, { foreignKey: "business_id", as: "business" });
NotificationPreference.belongsTo(User, { foreignKey: "user_id", as: "user" });

PushSubscription.belongsTo(Business, { foreignKey: "business_id", as: "business" });
PushSubscription.belongsTo(User, { foreignKey: "user_id", as: "user" });

export {
  Notification,
  NotificationDelivery,
  NotificationPreference,
  PushSubscription,
};
