import { bootstrapWorker } from "@vendure/core";
import { config } from "./vendure-config";

// Keep the process alive; in some Docker/Node environments the event loop can empty and the process exits with 0.
const keepAlive = setInterval(() => {}, 60000);

bootstrapWorker(config)
  .then((worker) => {
    console.log("Vendure worker started");
  })
  .catch((err) => {
    clearInterval(keepAlive);
    console.error(err);
    process.exit(1);
  });
