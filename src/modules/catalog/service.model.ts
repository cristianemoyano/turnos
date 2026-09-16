import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export interface ServiceAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  name: string;
  duration_minutes: number;
  price: string;
  active: boolean;
}

export type ServiceCreationAttributes = Omit<
  ServiceAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at" | "active"
> & { active?: boolean };

export class Service extends Model<ServiceAttributes, ServiceCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare name: string;
  declare duration_minutes: number;
  declare price: string;
  declare active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Service.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "services", modelName: "Service", paranoid: true, underscored: true },
);

export default Service;
