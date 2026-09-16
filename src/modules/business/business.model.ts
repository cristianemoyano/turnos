import { DataTypes, type CreationOptional } from "sequelize";
import { Model } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID } from "@/lib/base-model";
import { auditColumnDefs } from "@/lib/base-model";

export interface BusinessAttributes extends Timestamps {
  id: UUID;
  name: string;
  phone: string | null;
  address: string | null;
  slug: string;
  timezone: string;
  trial_ends_at: Date | null;
}

export type BusinessCreationAttributes = Omit<
  BusinessAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at" | "timezone" | "trial_ends_at"
> & {
  timezone?: string;
  trial_ends_at?: Date | null;
};

export class Business extends Model<BusinessAttributes, BusinessCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare name: string;
  declare phone: string | null;
  declare address: string | null;
  declare slug: string;
  declare timezone: string;
  declare trial_ends_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Business.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: { type: DataTypes.STRING(30) },
    address: { type: DataTypes.STRING(300) },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    timezone: { type: DataTypes.STRING(60), allowNull: false, defaultValue: "America/Argentina/Buenos_Aires" },
    trial_ends_at: { type: DataTypes.DATE },
    ...auditColumnDefs,
  },
  { sequelize, tableName: "businesses", modelName: "Business", paranoid: true, underscored: true },
);

export default Business;
