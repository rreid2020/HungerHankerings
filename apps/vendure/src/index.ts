import { bootstrap, runMigrations } from "@vendure/core";
import { config } from "./vendure-config";

// Run pending migrations with the same config (same DB) before starting the server.
runMigrations(config)
  .then((migrations) => {
    if (migrations.length) {
      console.log("Ran migrations:", migrations);
    }
    return bootstrap(config);
  })
  .then((app) => {
    console.log(`Vendure server listening on port ${config.apiOptions?.port ?? 3000}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
