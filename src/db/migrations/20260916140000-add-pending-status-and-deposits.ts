import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  // ALTER TYPE ... ADD VALUE must not share an implicit multi-statement
  // transaction with anything that could reference the new value, so it
  // runs in its own query call.
  await queryInterface.sequelize.query(`
    ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'confirmed';
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE appointments ADD COLUMN confirmation_token UUID NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE appointments ADD COLUMN deposit_required NUMERIC(10,2);
    ALTER TABLE appointments ADD COLUMN deposit_paid BOOLEAN NOT NULL DEFAULT false;
    CREATE UNIQUE INDEX idx_appointments_confirmation_token ON appointments(confirmation_token);

    ALTER TABLE services ADD COLUMN deposit_amount NUMERIC(10,2);
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE services DROP COLUMN IF EXISTS deposit_amount;
    DROP INDEX IF EXISTS idx_appointments_confirmation_token;
    ALTER TABLE appointments DROP COLUMN IF EXISTS deposit_paid;
    ALTER TABLE appointments DROP COLUMN IF EXISTS deposit_required;
    ALTER TABLE appointments DROP COLUMN IF EXISTS confirmation_token;
  `);
  // Postgres cannot drop a single enum value; leaving 'pending' in the type on
  // downgrade is a documented, accepted limitation.
};
