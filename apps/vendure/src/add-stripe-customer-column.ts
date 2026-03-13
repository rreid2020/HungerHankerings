/**
 * One-time script: add the Stripe plugin's Customer custom field column
 * (customFieldsStripeCustomerId) when storeCustomersInStripe is true and the
 * column was never created (e.g. synchronize was false).
 *
 * Run from repo root: pnpm run add-stripe-column:vendure
 * Or from apps/vendure: pnpm run build && node dist/add-stripe-customer-column.js
 *
 * Requires DB_* env vars (e.g. from .env on droplet or apps/vendure/.env).
 */
import { Client } from "pg";
import { config } from "./vendure-config";

const opts = config.dbConnectionOptions as {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

const columnName = "customFieldsStripeCustomerId"; // camelCase as in TypeORM
const columnDef = `ADD COLUMN IF NOT EXISTS "${columnName}" character varying`;

// Tables that might hold the Customer entity (schema.table)
const tableCandidates: [string, string][] = [
  ["public", "customer"],
  ["vendure", "customer"],
  ["public", "order_customer"],
  ["vendure", "order_customer"],
  ["order", "order_customer"],
  ["public", "order_order_customer"],
  ["vendure", "order_order_customer"],
];

async function main() {
  const client = new Client({
    host: opts.host,
    port: opts.port,
    user: opts.username,
    password: opts.password,
    database: opts.database,
    ssl: opts.ssl,
  });
  await client.connect();

  const tableNames = [...new Set(tableCandidates.map(([, t]) => t))];
  const tableList = tableNames.map((t) => `'${t}'`).join(",");
  const existing = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('public','vendure','order')
    AND table_name IN (${tableList})
    ORDER BY table_schema, table_name
  `);

  const tables = existing.rows as { table_schema: string; table_name: string }[];
  if (tables.length === 0) {
    console.log("No candidate Customer tables found. Exiting.");
    await client.end();
    process.exit(0);
  }

  for (const { table_schema, table_name } of tables) {
    const fullName = `${table_schema}.${table_name}`;
    const hasColumn = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
      [table_schema, table_name, columnName]
    );
    if (hasColumn.rows.length > 0) {
      console.log(`Column already exists on ${fullName}, skipping.`);
      continue;
    }
    try {
      await client.query(
        `ALTER TABLE "${table_schema}"."${table_name}" ${columnDef}`
      );
      console.log(`Added column to ${fullName}.`);
    } catch (e: unknown) {
      const err = e as Error;
      console.warn(`Could not alter ${fullName}:`, err.message);
    }
  }

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
