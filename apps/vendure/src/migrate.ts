import { runMigrations } from "@vendure/core";
import { config } from "./vendure-config";

runMigrations(config)
  .then((migrations) => {
    if (migrations.length) {
      console.log("Ran migrations:", migrations);
    } else {
      console.log("No pending migrations.");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
