"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fix Stripe Customer ID column so TypeORM can see it.
 * TypeORM expects exactly: "customFieldsStripeCustomerId" (camelCase).
 * If the column was created without quotes it may exist as "customfieldsstripecustomerid";
 * this script adds the correctly-cased column and migrates data if needed.
 *
 * Run on droplet after build:
 *   docker compose ... run --rm vendure node dist/fix-stripe-customer-column-casing.js
 */
const pg_1 = require("pg");
const vendure_config_1 = require("./vendure-config");
const opts = vendure_config_1.config.dbConnectionOptions;
const correctColumnName = "customFieldsStripeCustomerId";
const possibleWrongNames = ["customfieldsstripecustomerid", "customFieldsStripecustomerid"];
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
    WHERE table_schema IN ('public', 'vendure', 'order')
      AND table_name = 'customer'
    ORDER BY table_schema, table_name
  `);
    const rows = tables.rows;
    if (rows.length === 0) {
        console.log("No customer table found in public/vendure/order. Exiting.");
        await client.end();
        process.exit(0);
    }
    for (const { table_schema, table_name } of rows) {
        const fullName = `${table_schema}.${table_name}`;
        const cols = await client.query(`SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       AND (column_name = $3 OR column_name = ANY($4::text[]))`, [table_schema, table_name, correctColumnName, possibleWrongNames]);
        const columnNames = cols.rows.map((r) => r.column_name);
        const hasCorrect = columnNames.includes(correctColumnName);
        const wrongName = possibleWrongNames.find((n) => columnNames.includes(n));
        if (hasCorrect) {
            console.log(`${fullName}: column "${correctColumnName}" already correct.`);
            continue;
        }
        try {
            await client.query(`ALTER TABLE "${table_schema}"."${table_name}" ADD COLUMN IF NOT EXISTS "${correctColumnName}" character varying`);
            if (wrongName) {
                await client.query(`UPDATE "${table_schema}"."${table_name}" SET "${correctColumnName}" = "${wrongName}" WHERE "${wrongName}" IS NOT NULL`);
                await client.query(`ALTER TABLE "${table_schema}"."${table_name}" DROP COLUMN IF EXISTS "${wrongName}"`);
                console.log(`${fullName}: migrated "${wrongName}" -> "${correctColumnName}".`);
            }
            else {
                console.log(`${fullName}: added "${correctColumnName}".`);
            }
        }
        catch (e) {
            const err = e;
            console.warn(`${fullName}:`, err.message);
        }
    }
    await client.end();
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
