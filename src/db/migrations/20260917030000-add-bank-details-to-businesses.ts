import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses ADD COLUMN bank_details TEXT;
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses DROP COLUMN IF EXISTS bank_details;
  `);
};
