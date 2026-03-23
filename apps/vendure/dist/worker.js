"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@vendure/core");
const vendure_config_1 = require("./vendure-config");
const ensure_checkout_gift_surcharge_column_1 = require("./ensure-checkout-gift-surcharge-column");
// Keep the process alive; in some Docker/Node environments the event loop can empty and the process exits with 0.
const keepAlive = setInterval(() => { }, 60000);
(0, ensure_checkout_gift_surcharge_column_1.ensureCheckoutGiftSurchargeColumn)()
    .then(() => (0, core_1.bootstrapWorker)(vendure_config_1.config))
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
