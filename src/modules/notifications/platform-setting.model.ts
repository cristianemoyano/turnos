import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "@/lib/db";
import type { UUID } from "@/lib/base-model";

export interface PlatformSettingAttributes {
  id: UUID;
  singleton: boolean;
  push_vapid_enabled: boolean;
  push_vapid_public_key: string;
  push_vapid_private_key_encrypted: string;
  push_vapid_contact_email: string;
  created_at: Date;
  updated_at: Date;
}

type PlatformSettingCreationAttributes = Optional<
  PlatformSettingAttributes,
  | "id"
  | "singleton"
  | "push_vapid_enabled"
  | "push_vapid_public_key"
  | "push_vapid_private_key_encrypted"
  | "push_vapid_contact_email"
  | "created_at"
  | "updated_at"
>;

export class PlatformSetting extends Model<PlatformSettingAttributes, PlatformSettingCreationAttributes> {
  declare id: UUID;
  declare singleton: boolean;
  declare push_vapid_enabled: boolean;
  declare push_vapid_public_key: string;
  declare push_vapid_private_key_encrypted: string;
  declare push_vapid_contact_email: string;
  declare created_at: Date;
  declare updated_at: Date;
}

PlatformSetting.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    singleton: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    push_vapid_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    push_vapid_public_key: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    push_vapid_private_key_encrypted: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    push_vapid_contact_email: { type: DataTypes.STRING(320), allowNull: false, defaultValue: "" },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: "platform_settings",
    underscored: true,
    updatedAt: "updated_at",
    createdAt: "created_at",
  },
);

export default PlatformSetting;
