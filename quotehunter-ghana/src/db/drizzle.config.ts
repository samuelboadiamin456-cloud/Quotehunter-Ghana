import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

// Preferred: DATABASE_ADMIN_URL (Neon direct URL) or DATABASE_URL. Legacy: SQL_* variables.
const url = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;

let dbCredentials: any;
if (url) {
  dbCredentials = { url, ssl: process.env.DATABASE_SSL === "false" ? false : true };
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;
  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error("Set DATABASE_URL (or SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD).");
  }
  dbCredentials = { host: sqlHost, user, password, database: sqlDbName, ssl: false };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
