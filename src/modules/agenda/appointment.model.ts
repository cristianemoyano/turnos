import { DataTypes, Model, type CreationOptional } from "sequelize";
import sequelize from "@/lib/db";
import type { Timestamps, UUID, BusinessScoped } from "@/lib/base-model";
import { businessScopedColumnDefs } from "@/lib/base-model";

export type AppointmentStatus = "pending" | "confirmed" | "done" | "cancelled";
export type AppointmentSource = "staff" | "online";
export type AppointmentKind = "appointment" | "block";

export interface AppointmentAttributes extends Timestamps, BusinessScoped {
  id: UUID;
  professional_id: UUID | null;
  client_id: UUID | null;
  service_id: UUID | null;
  kind: AppointmentKind;
  status: AppointmentStatus;
  source: AppointmentSource;
  start_at: Date;
  duration_minutes: number;
  price: string | null;
  reason: string | null;
  confirmation_token: UUID;
  deposit_required: string | null;
  deposit_paid: boolean;
}

export type AppointmentCreationAttributes = Omit<
  AppointmentAttributes,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "kind"
  | "status"
  | "source"
  | "confirmation_token"
  | "deposit_required"
  | "deposit_paid"
> & {
  kind?: AppointmentKind;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  confirmation_token?: UUID;
  deposit_required?: string | null;
  deposit_paid?: boolean;
};

export class Appointment extends Model<AppointmentAttributes, AppointmentCreationAttributes> {
  declare id: CreationOptional<UUID>;
  declare business_id: UUID;
  declare professional_id: UUID | null;
  declare client_id: UUID | null;
  declare service_id: UUID | null;
  declare kind: AppointmentKind;
  declare status: AppointmentStatus;
  declare source: AppointmentSource;
  declare start_at: Date;
  declare duration_minutes: number;
  declare price: string | null;
  declare reason: string | null;
  declare confirmation_token: CreationOptional<UUID>;
  declare deposit_required: string | null;
  declare deposit_paid: CreationOptional<boolean>;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
}

Appointment.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    professional_id: { type: DataTypes.UUID },
    client_id: { type: DataTypes.UUID },
    service_id: { type: DataTypes.UUID },
    kind: { type: DataTypes.ENUM("appointment", "block"), allowNull: false, defaultValue: "appointment" },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "done", "cancelled"),
      allowNull: false,
      defaultValue: "confirmed",
    },
    source: { type: DataTypes.ENUM("staff", "online"), allowNull: false, defaultValue: "staff" },
    start_at: { type: DataTypes.DATE, allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2) },
    reason: { type: DataTypes.STRING(300) },
    confirmation_token: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4 },
    deposit_required: { type: DataTypes.DECIMAL(10, 2) },
    deposit_paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...businessScopedColumnDefs,
  },
  { sequelize, tableName: "appointments", modelName: "Appointment", paranoid: true, underscored: true },
);

export default Appointment;
