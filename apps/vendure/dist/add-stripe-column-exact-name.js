"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Add the Stripe customer ID column with the EXACT name TypeORM uses in queries.
 * Logs show: "customFieldsStripecustomerid" (lowercase 'c' in customerid).
 * Run on droplet: docker compose ... run --rm vendure node dist/add-stripe-column-exact-name.js
 */
const pg_1 = require("pg");
const vendure_config_1 = require("./vendure-config");
const opts = vendure_config_1.config.dbConnectionOptions;
// Exact name from the failing SQL in the logs
const columnName = "customFieldsStripecustomerid";
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
      AND table_name = 'customer'
    ORDER BY table_schema, table_name
  `);
    const rows = tables.rows;
    if (rows.length === 0) {
        console.log("No customer table found.");
        await client.end();
        process.exit(0);
    }
    for (const { table_schema, table_name } of rows) {
        const fullName = `${table_schema}.${table_name}`;
        const hasColumn = await client.query(`SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`, [table_schema, table_name, columnName]);
        if (hasColumn.rows.length > 0) {
            console.log(`${fullName}: column "${columnName}" already exists.`);
            continue;
        }
        try {
            await client.query(`ALTER TABLE "${table_schema}"."${table_name}" ADD COLUMN "${columnName}" character varying`);
            console.log(`${fullName}: added column "${columnName}".`);
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
