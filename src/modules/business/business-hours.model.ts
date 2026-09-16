import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type Shift = { from: string; to: string };

export interface BusinessHoursAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  day_of_week: Weekday;
  is_open: boolean;
  shifts: Shift[];
}

export type BusinessHoursCreationAttributes = Omit<
  BusinessHoursAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

export class BusinessHours extends Model<BusinessHoursAttributes, BusinessHoursCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare day_of_week: Weekday;
  declare is_open: boolean;
  declare shifts: Shift[];
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

BusinessHours.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    day_of_week: { type: DataTypes.ENUM("mon", "tue", "wed", "thu", "fri", "sat", "sun"), allowNull: false },
    is_open: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    shifts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "business_hours", modelName: "BusinessHours", paranoid: true, underscored: true },
);

export default BusinessHours;
