import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses
      ADD COLUMN instagram_url VARCHAR(500),
      ADD COLUMN facebook_url VARCHAR(500),
      ADD COLUMN tiktok_url VARCHAR(500);
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE businesses
      DROP COLUMN IF EXISTS instagram_url,
      DROP COLUMN IF EXISTS facebook_url,
      DROP COLUMN IF EXISTS tiktok_url;
  `);
};
