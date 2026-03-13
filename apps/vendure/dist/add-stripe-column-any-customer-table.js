"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Add customFieldsStripeCustomerId to EVERY table whose name contains "customer".
 * Covers customer, order_customer, order_order_customer, etc. in any schema.
 * Run on droplet: docker compose ... run --rm vendure node dist/add-stripe-column-any-customer-table.js
 */
const pg_1 = require("pg");
const vendure_config_1 = require("./vendure-config");
const opts = vendure_config_1.config.dbConnectionOptions;
const columnName = "customFieldsStripeCustomerId";
async function main() {
    const client = new pg_1.Client({
        host: opts.host,
        port: opts.port,
        user: opts.username,
        password: opts.password,
        database: opts.database,
        ssl: opts.ssl,
    });
    await client.connect();
    const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_name LIKE '%customer%'
    ORDER BY table_schema, table_name
  `);
    const rows = tables.rows;
    if (rows.length === 0) {
        console.log("No table with 'customer' in name found.");
        await client.end();
        process.exit(0);
    }
    for (const { table_schema, table_name } of rows) {
        const fullName = `${table_schema}.${table_name}`;
        const hasColumn = await client.query(`SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       AND (column_name = $3 OR column_name = LOWER($3))`, [table_schema, table_name, columnName]);
        if (hasColumn.rows.length > 0) {
            console.log(`${fullName}: column already present, skipping.`);
            continue;
        }
        try {
            await client.query(`ALTER TABLE "${table_schema}"."${table_name}" ADD COLUMN IF NOT EXISTS "${columnName}" character varying`);
            console.log(`${fullName}: added "${columnName}".`);
        }
        catch (e) {
            console.warn(`${fullName}:`, e.message);
        }
    }
    await client.end();
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
