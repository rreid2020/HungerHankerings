/**
 * One-time: add Order.customFieldsCheckoutGiftSurchargeCents when the column
 * was never created (production synchronize:false).
 *
 * Fixes: column order.customFieldsCheckoutgiftsurchargecents does not exist
 *
 * From apps/vendure after build:
 *   pnpm run build && pnpm run add-order-gift-surcharge-column
 *
 * On droplet (compose):
 *   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm vendure node dist/add-order-checkout-gift-surcharge-column.js
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

const columnName = "customFieldsCheckoutGiftSurchargeCents";
const columnDef = `ADD COLUMN IF NOT EXISTS "${columnName}" integer NULL`;

const tableCandidates: [string, string][] = [
  ["public", "order"],
  ["vendure", "order"],
  ["public", "order_order"],
  ["vendure", "order_order"],
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

  const tableList = [...new Set(tableCandidates.map(([, t]) => t))]
    .map((t) => `'${t}'`)
    .join(",");
  const existing = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('public','vendure')
      AND table_name IN (${tableList})
    ORDER BY table_schema, table_name
  `);

  const tables = existing.rows as { table_schema: string; table_name: string }[];
  if (tables.length === 0) {
    console.error("No candidate Order tables found (order / order_order). Check your DB.");
    await client.end();
    process.exit(1);
  }

  let added = 0;
  for (const { table_schema, table_name } of tables) {
    const fullName = `"${table_schema}"."${table_name}"`;
    const hasColumn = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
         AND (column_name = $3 OR LOWER(column_name) = LOWER($3))`,
      [table_schema, table_name, columnName]
    );
    if (hasColumn.rows.length > 0) {
      console.log(`Column already exists on ${fullName}, skipping.`);
      continue;
    }
    try {
      await client.query(`ALTER TABLE ${fullName} ${columnDef}`);
      console.log(`Added ${columnName} to ${fullName}.`);
      added++;
    } catch (e) {
      console.warn(`Could not alter ${fullName}:`, e instanceof Error ? e.message : e);
    }
  }

  await client.end();
  if (added === 0 && tables.length > 0) {
    console.log("No new columns added (may already exist on all matching tables).");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
