import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses DROP COLUMN IF EXISTS onboarding_completed_at;
  `);
};
