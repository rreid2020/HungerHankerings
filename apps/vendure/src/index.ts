import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";
import { ensureChannelDefaultCurrency } from "./ensure-channel-default-currency";
import { ensureCheckoutGiftSurchargeColumn } from "./ensure-checkout-gift-surcharge-column";

ensureCheckoutGiftSurchargeColumn()
  .then(() => ensureChannelDefaultCurrency())
  .then(() => bootstrap(config))
  .then(() => {
    console.log(`Vendure server listening on port ${config.apiOptions?.port ?? 3000}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
