"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderConfirmationEmailHandler = void 0;
const email_plugin_1 = require("@vendure/email-plugin");
const core_1 = require("@vendure/core");
const mock_events_1 = require("@vendure/email-plugin/lib/src/handler/mock-events");
const email_plain_order_for_email_1 = require("./email-plain-order-for-email");
const email_shipping_lines_1 = require("./email-shipping-lines");
const loggerCtx = "OrderConfirmationEmail";
function ordersInboxEmail() {
    return (process.env.ORDERS_INBOX_EMAIL?.trim() || "orders@hungerhankerings.com").trim();
}
/** When true, ops copy uses {@link ordersInboxNotificationHandler} only (rich template); no BCC here. */
function ordersInboxUsesSeparateEmailJob() {
    return (process.env.ORDERS_INBOX_SEPARATE_EMAIL === "true" ||
        process.env.ORDERS_INBOX_SEPARATE_EMAIL === "1");
}
/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
 *
 * By default, the store inbox (`ORDERS_INBOX_EMAIL` or orders@hungerhankerings.com) is **BCC** on this
 * email so ops receive the same confirmation as the customer in **one** SMTP send (avoids a second job
 * failing silently). Set `ORDERS_INBOX_SEPARATE_EMAIL=true` to use the dedicated inbox handler and template instead (no BCC).
 */
exports.orderConfirmationEmailHandler = new email_plugin_1.EmailEventListener("order-confirmation")
    .on(core_1.OrderStateTransitionEvent)
    .filter((event) => event.toState === "PaymentSettled" &&
    event.fromState !== "Modifying" &&
    !!event.order.customer)
    .loadData(async ({ event, injector }) => {
    (0, email_plugin_1.transformOrderLineAssetUrls)(event.ctx, event.order, injector);
    try {
        const shippingLines = await (0, email_shipping_lines_1.loadShippingLinesForEmailPlain)(event.ctx, event.order, injector);
        return { shippingLines };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        core_1.Logger.warn(`Shipping lines for email failed for order ${event.order.code}; sending confirmation without shipping breakdown. ${msg}`, loggerCtx);
        return { shippingLines: [] };
    }
})
    .setRecipient((event) => event.order.customer.emailAddress)
    .setOptionalAddressFields((event) => {
    if (ordersInboxUsesSeparateEmailJob()) {
        return {};
    }
    const inbox = ordersInboxEmail();
    const customer = event.order.customer.emailAddress.trim().toLowerCase();
    if (!inbox || inbox.toLowerCase() === customer) {
        return {};
    }
    return { bcc: inbox };
})
    .setFrom("{{ fromAddress }}")
    .setSubject("Order confirmation for #{{ order.code }}")
    .setTemplateVars((event) => ({
    order: (0, email_plain_order_for_email_1.toPlainOrderForEmail)(event.order),
    shippingLines: event.data.shippingLines,
}))
    .setMockEvent(mock_events_1.mockOrderStateTransitionEvent);
