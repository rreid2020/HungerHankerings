import type { Order } from "@vendure/core";
/** Serializable subset used by `order-confirmation` and `orders-inbox-notification` templates. */
export type PlainOrderLineForEmail = {
    quantity: number;
    discountedLinePriceWithTax: number;
    featuredAsset: {
        preview: string;
    } | null;
    productVariant: {
        name: string;
        sku: string;
        /** Stock templates reference `productVariant.quantity`; map ordered qty for display. */
        quantity: number;
        product: {
            name: string;
        };
    };
};
export type PlainOrderForEmail = {
    code: string;
    state: string;
    orderPlacedAt: Date | string | undefined;
    currencyCode: string;
    subTotal: number;
    subTotalWithTax: number;
    shipping: number;
    shippingWithTax: number;
    total: number;
    totalWithTax: number;
    customer: {
        firstName: string;
        lastName: string;
        emailAddress: string;
    } | null;
    shippingAddress: Record<string, string> | null;
    billingAddress: Record<string, string> | null;
    lines: PlainOrderLineForEmail[];
    discounts: {
        description: string;
        amount: number;
    }[];
    couponCodes: string[];
    taxSummary: {
        description: string;
        taxRate: number;
        taxBase: number;
        taxTotal: number;
    }[];
    payments: {
        state: string;
        method: string;
        amount: number;
    }[];
};
/**
 * Builds a JSON-friendly order snapshot for email templates so `send-email` jobs do not embed
 * TypeORM graphs (cycles, huge payloads, serialization failures).
 */
export declare function toPlainOrderForEmail(order: Order): PlainOrderForEmail;
//# sourceMappingURL=email-plain-order-for-email.d.ts.map