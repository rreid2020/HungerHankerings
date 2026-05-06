import { type EventWithAsyncData } from "@vendure/email-plugin";
import { OrderStateTransitionEvent } from "@vendure/core";
import type { PlainShippingLineForEmail } from "./email-plain-shipping-lines";
/**
 * Notify internal inbox when an order payment settles.
 * Registered only when `ORDERS_INBOX_SEPARATE_EMAIL=true`; otherwise the inbox receives a **BCC** on the
 * customer order confirmation (see `order-confirmation-email-handler.ts`).
 */
export declare const ordersInboxNotificationHandler: import("@vendure/email-plugin").EmailEventHandler<"orders-inbox-notification", EventWithAsyncData<OrderStateTransitionEvent, {
    shippingLines: PlainShippingLineForEmail[];
    giftLines: {
        lineLabel: string;
        unitKey: string;
        message: string;
    }[];
    giftFeeMinor: number;
}>>;
//# sourceMappingURL=orders-inbox-email-handler.d.ts.map