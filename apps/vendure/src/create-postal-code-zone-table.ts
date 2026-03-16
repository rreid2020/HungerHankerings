/**
 * One-time: create postal_code_zone table if missing (e.g. DB existed before PostalZonePlugin).
 * Run: pnpm run build && node dist/create-postal-code-zone-table.js
 * On droplet: docker compose run --rm vendure node dist/create-postal-code-zone-table.js
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
CREATE TABLE IF NOT EXISTS postal_code_zone (
  id SERIAL PRIMARY KEY,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "countryCode" varchar(2) NOT NULL,
  prefix varchar(6) NOT NULL DEFAULT '',
  "zoneName" varchar(128) NOT NULL,
  "rateCents" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_postal_code_zone_country_prefix ON postal_code_zone ("countryCode", prefix);
`;

async function main() {
  const client = new Client(db);
  await client.connect();
  try {
    await client.query(sql);
    const check = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'postal_code_zone'`
    );
    if (check.rows.length > 0) {
      console.log("postal_code_zone table exists.");
    } else {
      console.log("postal_code_zone table created.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
