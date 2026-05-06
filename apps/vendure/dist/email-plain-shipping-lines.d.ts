/** Fields used by order confirmation and orders-inbox email templates. */
export type PlainShippingLineForEmail = {
    shippingMethod: {
        name: string;
    };
    price: number;
    priceWithTax: number;
};
/** Maps hydrated shipping lines (e.g. from tests) into the plain email shape. */
export declare function toPlainShippingLinesForEmail(lines: Array<{
    shippingMethod?: {
        name?: string | null;
    } | null;
    price: number;
    priceWithTax: number;
}>): PlainShippingLineForEmail[];
//# sourceMappingURL=email-plain-shipping-lines.d.ts.map