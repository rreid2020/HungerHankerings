/**
 * Ensures Order custom-field columns for gift checkout (Postgres).
 * Run automatically before Vendure bootstrap so production (synchronize:false) self-heals.
 *
 * **Names must match TypeORM DefaultNamingStrategy** for embedded custom fields:
 * `camelCase(prefix) + titleCase(propertyName)` → titleCase uppercases only the first character
 * and lowercases the rest. Examples:
 * - checkoutGiftSurchargeCents → customFieldsCheckoutgiftsurchargecents
 * - giftByLineUnitJson → customFieldsGiftbylineunitjson
 * - giftMessages → customFieldsGiftmessages
 *
 * CLI: node dist/ensure-checkout-gift-surcharge-column.js
 */
import { Client } from "pg";
import { config } from "./vendure-config";

const COLUMNS: { name: string; sqlType: string }[] = [
  { name: "customFieldsCheckoutgiftsurchargecents", sqlType: "integer NULL" },
  { name: "customFieldsGiftbylineunitjson", sqlType: "text NULL" },
  { name: "customFieldsGiftmessages", sqlType: "text NULL" },
];

/** Postgres double-quote for identifiers. */
function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

const opts = config.dbConnectionOptions as {
  type?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

/** Vendure Order table: has code + state + subTotalWithTax (avoids order_line, etc.). */
async function findOrderTables(client: Client): Promise<{ table_schema: string; table_name: string }[]> {
  const r = await client.query(`
    SELECT t.table_schema, t.table_name
    FROM information_schema.tables t
    WHERE t.table_type = 'BASE TABLE'
      AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
      AND t.table_name NOT ILIKE '%line%'
      AND t.table_name NOT ILIKE '%modification%'
      AND t.table_name NOT ILIKE '%history%'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns x
        WHERE x.table_schema = t.table_schema AND x.table_name = t.table_name
          AND LOWER(x.column_name) = 'code'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns x
        WHERE x.table_schema = t.table_schema AND x.table_name = t.table_name
          AND LOWER(x.column_name) = 'state'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns x
        WHERE x.table_schema = t.table_schema AND x.table_name = t.table_name
          AND LOWER(x.column_name) = 'subtotalwithtax'
      )
  `);
  return r.rows as { table_schema: string; table_name: string }[];
}

async function ensureColumnOnTable(
  client: Client,
  table_schema: string,
  table_name: string,
  column: string,
  sqlType: string,
): Promise<void> {
  const fullName = `"${table_schema}"."${table_name}"`;
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
       AND LOWER(column_name) = LOWER($3)`,
    [table_schema, table_name, column],
  );
  const colRows = cols.rows as { column_name: string }[];
  const names = colRows.map((r) => r.column_name);
  if (names.includes(column)) {
    console.info(`[ensure-checkout-gift-fields] ${fullName}: "${column}" already present.`);
    return;
  }
  if (names.length === 1 && names[0] !== column) {
    const oldName = names[0];
    await client.query(
      `ALTER TABLE ${fullName} RENAME COLUMN ${quoteIdent(oldName)} TO ${quoteIdent(column)}`,
    );
    console.info(
      `[ensure-checkout-gift-fields] ${fullName}: renamed "${oldName}" -> "${column}" (TypeORM naming).`,
    );
    return;
  }
  if (names.length > 1) {
    console.warn(
      `[ensure-checkout-gift-fields] ${fullName}: multiple columns matching ${column} (${names.join(", ")}); fix manually.`,
    );
    return;
  }
  await client.query(`ALTER TABLE ${fullName} ADD COLUMN IF NOT EXISTS ${quoteIdent(column)} ${sqlType}`);
  console.info(`[ensure-checkout-gift-fields] ${fullName}: added "${column}".`);
}

export async function ensureCheckoutGiftSurchargeColumn(): Promise<void> {
  if (process.env.SKIP_CHECKOUT_GIFT_SURCHARGE_ENSURE === "true") {
    console.warn("[ensure-checkout-gift-fields] Skipped (SKIP_CHECKOUT_GIFT_SURCHARGE_ENSURE=true).");
    return;
  }
  if (opts.type && opts.type !== "postgres" && opts.type !== "cockroachdb") {
    console.info("[ensure-checkout-gift-fields] Skipping: DB is not Postgres.");
    return;
  }

  const client = new Client({
    host: opts.host,
    port: opts.port,
    user: opts.username,
    password: opts.password,
    database: opts.database,
    ssl: opts.ssl,
    connectionTimeoutMillis: 15_000,
  } as ConstructorParameters<typeof Client>[0]);
  await client.connect();

  try {
    const tables = await findOrderTables(client);
    const fallback: { table_schema: string; table_name: string }[] = [
      { table_schema: "public", table_name: "order" },
      { table_schema: "public", table_name: "order_order" },
    ];

    const targets =
      tables.length > 0
        ? tables
        : (() => {
            console.warn(
              "[ensure-checkout-gift-fields] Could not detect Order table by columns; trying public.order / public.order_order.",
            );
            return fallback;
          })();

    for (const { table_schema, table_name } of targets) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2`,
        [table_schema, table_name],
      );
      if (exists.rows.length === 0) continue;

      for (const col of COLUMNS) {
        await ensureColumnOnTable(client, table_schema, table_name, col.name, col.sqlType);
      }
    }
  } finally {
    await client.end();
  }
}

async function cliMain() {
  try {
    await ensureCheckoutGiftSurchargeColumn();
    process.exit(0);
  } catch (e) {
    console.error("[ensure-checkout-gift-fields] Failed:", e);
    process.exit(1);
  }
}

if (require.main === module) {
  void cliMain();
}
