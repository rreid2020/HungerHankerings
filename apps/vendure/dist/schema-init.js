"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-time initial schema creation: bootstrap with RUN_SCHEMA_SYNC=1 so TypeORM
 * creates all tables, then exit. Only run when check-schema exits 1 (no administrator table).
 */
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
(0, core_1.bootstrap)(vendure_config_1.config)
    .then((app) => {
    console.log("[schema-init] Schema created; shutting down.");
    return app.close();
})
    .then(() => process.exit(0))
    .catch((err) => {
    console.error("[schema-init]", err);
    process.exit(1);
});
