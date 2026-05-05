import type { hydrateShippingLines } from "@vendure/email-plugin";

/** Fields used by stock `order-confirmation` and our `orders-inbox-notification` templates only. */
export type PlainShippingLineForEmail = {
  shippingMethod: { name: string };
  price: number;
  priceWithTax: number;
};

export function toPlainShippingLinesForEmail(
  lines: Awaited<ReturnType<typeof hydrateShippingLines>>,
): PlainShippingLineForEmail[] {
  return lines.map((line) => ({
    shippingMethod: { name: line.shippingMethod?.name?.trim() ?? "" },
    price: line.price,
    priceWithTax: line.priceWithTax,
  }));
}
