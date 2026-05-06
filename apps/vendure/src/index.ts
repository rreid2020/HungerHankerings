import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";
import { runStartupEnsures } from "./run-startup-ensures";

runStartupEnsures()
  .then(() => bootstrap(config))
  .then(() => {
    console.log(`Vendure server listening on port ${config.apiOptions?.port ?? 3000}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
