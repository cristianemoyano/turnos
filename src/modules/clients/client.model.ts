import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export interface ClientAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  name: string;
  phone: string | null;
  notes: string | null;
}

export type ClientCreationAttributes = Omit<
  ClientAttributes,
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

export class Client extends Model<ClientAttributes, ClientCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare name: string;
  declare phone: string | null;
  declare notes: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Client.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    phone: { type: DataTypes.STRING(30) },
    notes: { type: DataTypes.TEXT },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "clients", modelName: "Client", paranoid: true, underscored: true },
);

export default Client;
