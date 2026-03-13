"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Exit 0 if Vendure schema exists (administrator table), 1 otherwise.
 * Used by deploy to decide whether to run schema-init.
 */
const pg_1 = require("pg");
const vendure_config_1 = require("./vendure-config");
const opts = vendure_config_1.config.dbConnectionOptions;
const client = new pg_1.Client({
    host: opts.host,
    port: opts.port,
    user: opts.username,
    password: opts.password,
    database: opts.database,
    ssl: opts.ssl,
});
client
    .connect()
    .then(() => client.query(`SELECT 1 FROM information_schema.tables WHERE table_schema IN ('public', 'vendure') AND table_name = 'administrator'`))
    .then((res) => {
    client.end().catch(() => { });
    process.exit(res.rows.length > 0 ? 0 : 1);
})
    .catch((err) => {
    console.error("[check-schema]", err.message);
    client.end().catch(() => { });
    process.exit(2);
});
