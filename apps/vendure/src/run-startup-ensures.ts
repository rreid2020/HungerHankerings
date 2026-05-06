import { ensureChannelDefaultCurrency } from "./ensure-channel-default-currency";
import { ensureCheckoutGiftSurchargeColumn } from "./ensure-checkout-gift-surcharge-column";

/**
 * Pre-bootstrap DB helpers must never take down the API/worker (502/504 for all routes).
 * Log and continue so Admin/Shop can recover; fix DB and redeploy or run ensures manually.
 */
export async function runStartupEnsures(): Promise<void> {
  try {
    await ensureCheckoutGiftSurchargeColumn();
  } catch (e) {
    console.error("[vendure] ensureCheckoutGiftSurchargeColumn failed (continuing startup):", e);
  }
  try {
    await ensureChannelDefaultCurrency();
  } catch (e) {
    console.error("[vendure] ensureChannelDefaultCurrency failed (continuing startup):", e);
  }
}
