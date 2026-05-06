import type { hydrateShippingLines } from "@vendure/email-plugin";
/** Fields used by stock `order-confirmation` and our `orders-inbox-notification` templates only. */
export type PlainShippingLineForEmail = {
    shippingMethod: {
        name: string;
    };
    price: number;
    priceWithTax: number;
};
export declare function toPlainShippingLinesForEmail(lines: Awaited<ReturnType<typeof hydrateShippingLines>>): PlainShippingLineForEmail[];
//# sourceMappingURL=email-plain-shipping-lines.d.ts.map