import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "@/lib/db";
import type { UUID } from "@/lib/base-model";
import type { NotificationChannel, NotificationEventKey } from "./notification.schema";

export interface NotificationPreferenceAttributes {
  id: UUID;
  business_id: UUID;
  user_id: UUID;
  event_key: NotificationEventKey | string;
  channel: NotificationChannel;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

type NotificationPreferenceCreationAttributes = Optional<
  NotificationPreferenceAttributes,
  "id" | "enabled" | "created_at" | "updated_at" | "deleted_at"
>;

export class NotificationPreference extends Model<
  NotificationPreferenceAttributes,
  NotificationPreferenceCreationAttributes
> {
  declare id: UUID;
  declare business_id: UUID;
  declare user_id: UUID;
  declare event_key: string;
  declare channel: NotificationChannel;
  declare enabled: boolean;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

NotificationPreference.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    event_key: { type: DataTypes.STRING(64), allowNull: false },
    channel: { type: DataTypes.STRING(16), allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "notification_preferences", paranoid: true, underscored: true },
);

export default NotificationPreference;
