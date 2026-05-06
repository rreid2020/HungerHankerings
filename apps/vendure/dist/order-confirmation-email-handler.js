"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderConfirmationEmailHandler = void 0;
const email_plugin_1 = require("@vendure/email-plugin");
const core_1 = require("@vendure/core");
const mock_events_1 = require("@vendure/email-plugin/lib/src/handler/mock-events");
const email_plain_order_for_email_1 = require("./email-plain-order-for-email");
const email_plain_shipping_lines_1 = require("./email-plain-shipping-lines");
const loggerCtx = "OrderConfirmationEmail";
/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
 */
exports.orderConfirmationEmailHandler = new email_plugin_1.EmailEventListener("order-confirmation")
    .on(core_1.OrderStateTransitionEvent)
    .filter((event) => event.toState === "PaymentSettled" &&
    event.fromState !== "Modifying" &&
    !!event.order.customer)
    .loadData(async ({ event, injector }) => {
    (0, email_plugin_1.transformOrderLineAssetUrls)(event.ctx, event.order, injector);
    try {
        const hydrated = await (0, email_plugin_1.hydrateShippingLines)(event.ctx, event.order, injector);
        return { shippingLines: (0, email_plain_shipping_lines_1.toPlainShippingLinesForEmail)(hydrated) };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        core_1.Logger.warn(`Shipping line hydration failed for order ${event.order.code}; sending confirmation with fallback shipping totals only. ${msg}`, loggerCtx);
        return { shippingLines: [] };
    }
})
    .setRecipient((event) => event.order.customer.emailAddress)
    .setFrom("{{ fromAddress }}")
    .setSubject("Order confirmation for #{{ order.code }}")
    .setTemplateVars((event) => ({
    order: (0, email_plain_order_for_email_1.toPlainOrderForEmail)(event.order),
    shippingLines: event.data.shippingLines,
}))
    .setMockEvent(mock_events_1.mockOrderStateTransitionEvent);
