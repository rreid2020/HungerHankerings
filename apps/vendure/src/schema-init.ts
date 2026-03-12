/**
 * One-time initial schema creation: bootstrap with RUN_SCHEMA_SYNC=1 so TypeORM
 * creates all tables, then exit. Only run when check-schema exits 1 (no administrator table).
 */
import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";

bootstrap(config)
  .then((app) => {
    console.log("[schema-init] Schema created; shutting down.");
    return app.close();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[schema-init]", err);
    process.exit(1);
  });
