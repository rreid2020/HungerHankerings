"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStartupEnsures = runStartupEnsures;
const ensure_channel_default_currency_1 = require("./ensure-channel-default-currency");
const ensure_checkout_gift_surcharge_column_1 = require("./ensure-checkout-gift-surcharge-column");
/**
 * Pre-bootstrap DB helpers must never take down the API/worker (502/504 for all routes).
 * Log and continue so Admin/Shop can recover; fix DB and redeploy or run ensures manually.
 */
async function runStartupEnsures() {
    try {
        await (0, ensure_checkout_gift_surcharge_column_1.ensureCheckoutGiftSurchargeColumn)();
    }
    catch (e) {
        console.error("[vendure] ensureCheckoutGiftSurchargeColumn failed (continuing startup):", e);
    }
    try {
        await (0, ensure_channel_default_currency_1.ensureChannelDefaultCurrency)();
    }
    catch (e) {
        console.error("[vendure] ensureChannelDefaultCurrency failed (continuing startup):", e);
    }
}
