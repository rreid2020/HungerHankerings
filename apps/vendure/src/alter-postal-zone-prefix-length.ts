/**
 * One-time: widen postal_code_zone.prefix to varchar(6) for remote-zone support.
 * Run after create-postal-code-zone-table. Safe if column is already wide.
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

const sql = `
ALTER TABLE postal_code_zone
  ALTER COLUMN prefix TYPE varchar(6) USING (prefix::varchar(6));
`;

async function main() {
  const client = new Client(db);
  await client.connect();
  try {
    await client.query(sql);
    console.log("postal_code_zone.prefix is now varchar(6).");
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
