/**
 * Vendure creates the default Channel with USD (`CurrencyCode.USD`). This shop settles in CAD:
 * orders carry `currencyCode` from the channel, and Stripe charges that ISO currency.
 *
 * Idempotent: when `VENDURE_CHANNEL_DEFAULT_CURRENCY` is unset, only switches channels that still
 * default to **USD** → **CAD**. Set `VENDURE_CHANNEL_DEFAULT_CURRENCY=CAD` (or another ISO code)
 * explicitly to force that default on every channel regardless of current currency.
 *
 * **Variant prices** must exist for the target currency (Admin → product variant prices).
 *
 * CLI: `node dist/ensure-channel-default-currency.js`
 */
import { Client } from "pg";
import { config } from "./vendure-config";

const opts = config.dbConnectionOptions as {
  type?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
};

function mergeSimpleArrayCsv(raw: string | null | undefined, targetUpper: string): string {
  const parts = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toUpperCase());
  const next = new Set(parts);
  next.add(targetUpper.toUpperCase());
  return Array.from(next).join(",");
}

function normalizeCurrencyCsv(raw: string | null | undefined): string {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

async function resolveChannelTable(client: Client): Promise<{
  schema: string;
  table: string;
  defaultCol: string;
  availableCol: string;
  codeCol: string;
} | null> {
  const r = await client.query(`
    SELECT
      c.table_schema AS schema,
      c.table_name AS tbl,
      MAX(CASE
        WHEN c.column_name IN ('defaultCurrencyCode', 'defaultcurrencycode') THEN c.column_name
      END) AS def_col,
      MAX(CASE
        WHEN c.column_name IN ('availableCurrencyCodes', 'availablecurrencycodes') THEN c.column_name
      END) AS avail_col,
      MAX(CASE WHEN LOWER(c.column_name) = 'code' THEN c.column_name END) AS code_col
    FROM information_schema.columns c
    WHERE c.table_schema NOT IN ('information_schema', 'pg_catalog')
    GROUP BY c.table_schema, c.table_name
    HAVING MAX(CASE
      WHEN c.column_name IN ('defaultCurrencyCode', 'defaultcurrencycode') THEN 1 END) IS NOT NULL
      AND MAX(CASE
        WHEN c.column_name IN ('availableCurrencyCodes', 'availablecurrencycodes') THEN 1 END) IS NOT NULL
      AND MAX(CASE WHEN LOWER(c.column_name) = 'code' THEN 1 END) IS NOT NULL
    ORDER BY CASE WHEN MIN(c.table_name) = 'channel' THEN 0 ELSE 1 END, MIN(c.table_schema), MIN(c.table_name)
    LIMIT 1
  `);
  const row = r.rows[0] as
    | { schema: string; tbl: string; def_col: string; avail_col: string; code_col: string }
    | undefined;
  if (!row?.def_col || !row.avail_col || !row.code_col) return null;
  return {
    schema: row.schema,
    table: row.tbl,
    defaultCol: row.def_col,
    availableCol: row.avail_col,
    codeCol: row.code_col,
  };
}

export async function ensureChannelDefaultCurrency(): Promise<void> {
  if (process.env.SKIP_ENSURE_CHANNEL_DEFAULT_CURRENCY === "true") {
    console.warn("[ensure-channel-currency] Skipped (SKIP_ENSURE_CHANNEL_DEFAULT_CURRENCY=true).");
    return;
  }
  if (opts.type && opts.type !== "postgres" && opts.type !== "cockroachdb") {
    console.info("[ensure-channel-currency] Skipping: DB is not Postgres.");
    return;
  }

  const rawTarget = process.env.VENDURE_CHANNEL_DEFAULT_CURRENCY?.trim().toUpperCase();
  const target = rawTarget && /^[A-Z]{3}$/.test(rawTarget) ? rawTarget : "CAD";
  const explicitEnv = Boolean(process.env.VENDURE_CHANNEL_DEFAULT_CURRENCY?.trim());

  const client = new Client({
    host: opts.host,
    port: opts.port,
    user: opts.username,
    password: opts.password,
    database: opts.database,
    ssl: opts.ssl,
  });
  await client.connect();

  try {
    const resolved = await resolveChannelTable(client);
    if (!resolved) {
      console.warn("[ensure-channel-currency] Could not find channel table / currency columns; skipping.");
      return;
    }

    const { schema, table, defaultCol, availableCol, codeCol } = resolved;
    const fullTable = `"${schema.replace(/"/g, '""')}"."${table.replace(/"/g, '""')}"`;
    const qDef = `"${defaultCol.replace(/"/g, '""')}"`;
    const qAvail = `"${availableCol.replace(/"/g, '""')}"`;
    const qCode = `"${codeCol.replace(/"/g, '""')}"`;

    const sel = await client.query(
      `SELECT ${qCode} AS code, ${qDef} AS def, ${qAvail} AS avail FROM ${fullTable}`,
    );
    const list = sel.rows as { code: string; def: string; avail: string | null }[];

    for (const row of list) {
      const cur = (row.def ?? "").trim().toUpperCase();
      const mergedAvail = mergeSimpleArrayCsv(row.avail, target);
      const availNeedsWrite = normalizeCurrencyCsv(mergedAvail) !== normalizeCurrencyCsv(row.avail);

      let defaultNeedsWrite = cur !== target;
      if (defaultNeedsWrite) {
        if (!explicitEnv && cur !== "USD") {
          console.warn(
            `[ensure-channel-currency] Channel "${row.code}" uses ${cur}, not ${target}. ` +
              `Set VENDURE_CHANNEL_DEFAULT_CURRENCY=${target} to switch, or SKIP_ENSURE_CHANNEL_DEFAULT_CURRENCY=true to leave unchanged.`,
          );
          defaultNeedsWrite = false;
        }
      }

      if (!defaultNeedsWrite && !availNeedsWrite) continue;

      await client.query(
        `UPDATE ${fullTable} SET ${qDef} = $1, ${qAvail} = $2 WHERE ${qCode} = $3`,
        [target, mergedAvail, row.code],
      );
      console.info(
        `[ensure-channel-currency] Channel "${row.code}": defaultCurrency ${cur || "(empty)"} → ${target}; availableCurrencyCodes → ${mergedAvail}`,
      );
    }
  } finally {
    await client.end();
  }
}

async function cliMain() {
  try {
    await ensureChannelDefaultCurrency();
    process.exit(0);
  } catch (e) {
    console.error("[ensure-channel-currency] Failed:", e);
    process.exit(1);
  }
}

if (require.main === module) {
  void cliMain();
}
