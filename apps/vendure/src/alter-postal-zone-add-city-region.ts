/**
 * One-time: add city and region columns to postal_code_zone for display.
 * Run after create-postal-code-zone-table. Safe if columns already exist.
 */
import { Client } from "pg";

require("dotenv").config();

const db = {
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  user: process.env.DB_USER ?? "vendure",
  password: process.env.DB_PASSWORD ?? "vendure",
  database: process.env.DB_NAME ?? "vendure",
  ssl:
    process.env.DB_SSL === "false"
      ? false
      : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
};

async function main() {
  const client = new Client(db);
  await client.connect();
  try {
    await client.query(`ALTER TABLE postal_code_zone ADD COLUMN IF NOT EXISTS city varchar(128);`);
    await client.query(`ALTER TABLE postal_code_zone ADD COLUMN IF NOT EXISTS region varchar(128);`);
    console.log("postal_code_zone: city and region columns added (if missing).");
  } catch (err: any) {
    if (err?.code === "42P01") {
      console.log("Table postal_code_zone does not exist; skip or run create-postal-code-zone-table first.");
      process.exit(0);
    }
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
