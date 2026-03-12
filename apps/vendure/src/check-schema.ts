/**
 * Exit 0 if Vendure schema exists (administrator table), 1 otherwise.
 * Used by deploy to decide whether to run schema-init.
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

const client = new Client({
  host: opts.host,
  port: opts.port,
  user: opts.username,
  password: opts.password,
  database: opts.database,
  ssl: opts.ssl,
});

client
  .connect()
  .then(() =>
    client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema IN ('public', 'vendure') AND table_name = 'administrator'`
    )
  )
  .then((res: { rows: unknown[] }) => {
    client.end().catch(() => {});
    process.exit(res.rows.length > 0 ? 0 : 1);
  })
  .catch((err: Error) => {
    console.error("[check-schema]", err.message);
    client.end().catch(() => {});
    process.exit(2);
  });
