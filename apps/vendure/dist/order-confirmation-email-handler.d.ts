import { type EventWithAsyncData } from "@vendure/email-plugin";
import { OrderStateTransitionEvent } from "@vendure/core";
import { type PlainShippingLineForEmail } from "./email-plain-shipping-lines";
/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
 */
export declare const orderConfirmationEmailHandler: import("@vendure/email-plugin").EmailEventHandler<"order-confirmation", EventWithAsyncData<OrderStateTransitionEvent, {
    shippingLines: PlainShippingLineForEmail[];
}>>;
//# sourceMappingURL=order-confirmation-email-handler.d.ts.map