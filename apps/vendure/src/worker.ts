import { bootstrapWorker } from "@vendure/core";
import { config } from "./vendure-config";
import { runStartupEnsures } from "./run-startup-ensures";

// Keep the process alive; in some Docker/Node environments the event loop can empty and the process exits with 0.
const keepAlive = setInterval(() => {}, 60000);

runStartupEnsures()
  .then(() => bootstrapWorker(config))
  .then((worker) => {
    return worker.startJobQueue();
  })
  .then(() => {
    console.log("Vendure worker started");
  })
  .catch((err) => {
    clearInterval(keepAlive);
    console.error(err);
    process.exit(1);
  });
