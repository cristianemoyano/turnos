import path from "path";
import { Umzug, SequelizeStorage } from "umzug";
import sequelize from "./db";

const migrationsGlob =
  process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "src/db/migrations/*.{ts,js}")
    : path.join(__dirname, "../db/migrations/*.ts");

export const umzug = new Umzug({
  migrations: {
    glob: migrationsGlob,
    resolve: ({ name, path: migrationPath, context }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration = require(migrationPath!);
      return {
        name,
        up: async () => migration.up({ context }, sequelize.constructor),
        down: async () => migration.down({ context }, sequelize.constructor),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

export type Migration = typeof umzug._types.migration;
