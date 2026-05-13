import type { Order } from "@vendure/core";
export declare function giftLineLabel(order: Order, unitKey: string): string;
export declare function giftRowsFromOrder(order: Order): {
    unitKey: string;
    message: string;
}[];
/** Gift wrap surcharge in minor units; not included in {@link Order.totalWithTax} when only added on Stripe PI. */
export declare function giftFeeCents(order: Order): number;
export type GiftLineForEmail = {
    unitKey: string;
    message: string;
    lineLabel: string;
};
export declare function buildGiftLinesForEmail(order: Order): GiftLineForEmail[];
//# sourceMappingURL=email-order-gift-data.d.ts.map