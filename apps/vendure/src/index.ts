import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";
import { ensureCheckoutGiftSurchargeColumn } from "./ensure-checkout-gift-surcharge-column";

ensureCheckoutGiftSurchargeColumn()
  .then(() => bootstrap(config))
  .then(() => {
    console.log(`Vendure server listening on port ${config.apiOptions?.port ?? 3000}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
