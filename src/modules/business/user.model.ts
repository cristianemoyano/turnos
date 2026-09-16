import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export interface UserAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  email: string;
  password_hash: string;
  name: string;
}

export type UserCreationAttributes = Omit<UserAttributes, "id" | "created_at" | "updated_at" | "deleted_at">;

export class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare email: string;
  declare password_hash: string;
  declare name: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "users", modelName: "User", paranoid: true, underscored: true },
);

export default User;
