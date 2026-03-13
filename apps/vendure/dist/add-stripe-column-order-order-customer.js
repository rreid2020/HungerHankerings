"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Add customFieldsStripeCustomerId to order_order_customer table(s).
 * Run on droplet: docker compose ... run --rm vendure node dist/add-stripe-column-order-order-customer.js
 */
const pg_1 = require("pg");
const vendure_config_1 = require("./vendure-config");
const opts = vendure_config_1.config.dbConnectionOptions;
const columnName = "customFieldsStripeCustomerId";
const schemas = ["public", "vendure", "order"];
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
    for (const schema of schemas) {
        try {
            await client.query(`ALTER TABLE "${schema}"."order_order_customer" ADD COLUMN IF NOT EXISTS "${columnName}" character varying`);
            console.log(`Added or confirmed column on ${schema}.order_order_customer`);
        }
        catch (e) {
            const err = e;
            if (err.message?.includes("does not exist")) {
                console.log(`Table ${schema}.order_order_customer not found, skipping`);
            }
            else {
                console.warn(`${schema}.order_order_customer:`, err.message);
            }
        }
    }
    await client.end();
    process.exit(0);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
