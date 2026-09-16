import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export interface ProfessionalAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  name: string;
  phone: string | null;
}

export type ProfessionalCreationAttributes = Omit<
  ProfessionalAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

export class Professional extends Model<ProfessionalAttributes, ProfessionalCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare name: string;
  declare phone: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Professional.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: { type: DataTypes.STRING(30) },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "professionals", modelName: "Professional", paranoid: true, underscored: true },
);

export default Professional;
