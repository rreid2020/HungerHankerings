/**
 * Gift wrap/card add-on: same fee and tax basis as checkout UI (tax on net gift at shipping province rate).
 * Used by /api/checkout/complete and should stay aligned with checkout page totals.
 */
import { getTaxRate } from "./shippingTax"

export const CHECKOUT_GIFT_BOX_FEE_DOLLARS = 3.99

/** Minor currency units (e.g. cents for CAD) to add to Stripe on top of Vendure order.totalWithTax. */
export function checkoutGiftSurchargeMinorUnits(
  giftBoxCount: number,
  maxBoxes: number,
  countryCode: string,
  province: string
): number {
  const n = Math.min(
    Math.max(0, Math.floor(Number(giftBoxCount))),
    Math.max(0, Math.floor(Number(maxBoxes)))
  )
  if (n <= 0) return 0
  const net = n * CHECKOUT_GIFT_BOX_FEE_DOLLARS
  const rate = getTaxRate(countryCode, province)
  return Math.round(net * (1 + rate) * 100)
}
