import { Model, DataTypes } from "sequelize";

export type UUID = string;

export type Timestamps = {
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type BusinessScoped = { business_id: UUID };

export abstract class BusinessModel<
  TAttr extends Timestamps & BusinessScoped,
  TCreate extends Record<string, unknown>,
> extends Model<TAttr, TCreate> {
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare business_id: UUID;
}

export const auditColumnDefs = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
  deleted_at: { type: DataTypes.DATE },
} as const;

export const businessScopedColumnDefs = {
  ...auditColumnDefs,
  business_id: { type: DataTypes.UUID, allowNull: false },
} as const;
