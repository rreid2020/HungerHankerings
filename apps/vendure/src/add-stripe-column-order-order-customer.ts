/**
 * Add customFieldsStripeCustomerId to order_order_customer table(s).
 * Run on droplet: docker compose ... run --rm vendure node dist/add-stripe-column-order-order-customer.js
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

const columnName = "customFieldsStripeCustomerId";
const schemas = ["public", "vendure", "order"];

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

  for (const schema of schemas) {
    try {
      await client.query(
        `ALTER TABLE "${schema}"."order_order_customer" ADD COLUMN IF NOT EXISTS "${columnName}" character varying`
      );
      console.log(`Added or confirmed column on ${schema}.order_order_customer`);
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message?.includes("does not exist")) {
        console.log(`Table ${schema}.order_order_customer not found, skipping`);
      } else {
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
