import { type EventWithAsyncData } from "@vendure/email-plugin";
import { OrderStateTransitionEvent } from "@vendure/core";
import type { PlainShippingLineForEmail } from "./email-plain-shipping-lines";
/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
 *
 * By default, the store inbox (`ORDERS_INBOX_EMAIL` or orders@hungerhankerings.com) is **BCC** on this
 * email so ops receive the same confirmation as the customer in **one** SMTP send (avoids a second job
 * failing silently). Set `ORDERS_INBOX_SEPARATE_EMAIL=true` to use the dedicated inbox handler and template instead (no BCC).
 */
export declare const orderConfirmationEmailHandler: import("@vendure/email-plugin").EmailEventHandler<"order-confirmation", EventWithAsyncData<OrderStateTransitionEvent, {
    shippingLines: PlainShippingLineForEmail[];
}>>;
//# sourceMappingURL=order-confirmation-email-handler.d.ts.map