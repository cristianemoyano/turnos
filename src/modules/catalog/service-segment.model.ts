import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID } from "@/lib/base-model";
import { auditColumnDefs } from "@/lib/base-model";

export type SegmentType = "work" | "wait";

export interface ServiceSegmentAttributes extends Timestamps {
  id: UUID;
  service_id: UUID;
  type: SegmentType;
  label: string;
  duration_minutes: number;
  position: number;
}

export type ServiceSegmentCreationAttributes = Omit<
  ServiceSegmentAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at" | "position"
> & { position?: number };

export class ServiceSegment extends Model<ServiceSegmentAttributes, ServiceSegmentCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare service_id: UUID;
  declare type: SegmentType;
  declare label: string;
  declare duration_minutes: number;
  declare position: number;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

ServiceSegment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    service_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM("work", "wait"), allowNull: false },
    label: { type: DataTypes.STRING(200), allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ...auditColumnDefs,
  },
  { sequelize, tableName: "service_segments", modelName: "ServiceSegment", paranoid: true, underscored: true },
);

export default ServiceSegment;
