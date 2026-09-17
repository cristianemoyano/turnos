import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "@/lib/db";
import type { UUID } from "@/lib/base-model";

export interface PushSubscriptionAttributes {
  id: UUID;
  business_id: UUID;
  user_id: UUID;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

type PushSubscriptionCreationAttributes = Optional<
  PushSubscriptionAttributes,
  "id" | "user_agent" | "created_at" | "updated_at" | "deleted_at"
>;

export class PushSubscription extends Model<
  PushSubscriptionAttributes,
  PushSubscriptionCreationAttributes
> {
  declare id: UUID;
  declare business_id: UUID;
  declare user_id: UUID;
  declare endpoint: string;
  declare p256dh_key: string;
  declare auth_key: string;
  declare user_agent: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

PushSubscription.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    business_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    endpoint: { type: DataTypes.TEXT, allowNull: false },
    p256dh_key: { type: DataTypes.TEXT, allowNull: false },
    auth_key: { type: DataTypes.TEXT, allowNull: false },
    user_agent: { type: DataTypes.STRING(500), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "push_subscriptions", paranoid: true, underscored: true },
);

export default PushSubscription;
