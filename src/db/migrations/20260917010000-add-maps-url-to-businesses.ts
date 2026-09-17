import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses ADD COLUMN maps_url VARCHAR(500);
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses DROP COLUMN IF EXISTS maps_url;
  `);
};
