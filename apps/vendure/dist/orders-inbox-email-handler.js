"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersInboxNotificationHandler = void 0;
const email_plugin_1 = require("@vendure/email-plugin");
const core_1 = require("@vendure/core");
const email_hydrate_order_1 = require("./email-hydrate-order");
const email_order_gift_data_1 = require("./email-order-gift-data");
const email_plain_order_for_email_1 = require("./email-plain-order-for-email");
const email_shipping_lines_1 = require("./email-shipping-lines");
const loggerCtx = "OrdersInboxEmail";
/**
 * Notify internal inbox when an order payment settles.
 * Registered only when `ORDERS_INBOX_SEPARATE_EMAIL=true`; otherwise the inbox receives a **BCC** on the
 * customer order confirmation (see `order-confirmation-email-handler.ts`).
 */
exports.ordersInboxNotificationHandler = new email_plugin_1.EmailEventListener("orders-inbox-notification")
    .on(core_1.OrderStateTransitionEvent)
    .filter((event) => event.toState === "PaymentSettled" && event.fromState !== "Modifying")
    .loadData(async ({ event, injector }) => {
    await (0, email_hydrate_order_1.hydrateOrderForEmail)(event.ctx, event.order, injector);
    (0, email_plugin_1.transformOrderLineAssetUrls)(event.ctx, event.order, injector);
    let shippingLines = [];
    try {
        shippingLines = await (0, email_shipping_lines_1.loadShippingLinesForEmailPlain)(event.ctx, event.order, injector);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        core_1.Logger.warn(`Shipping lines for inbox email failed for order ${event.order.code}; continuing without shipping breakdown. ${msg}`, loggerCtx);
    }
    const giftLines = (0, email_order_gift_data_1.buildGiftLinesForEmail)(event.order);
    const giftFeeMinor = (0, email_order_gift_data_1.giftFeeCents)(event.order);
    return { shippingLines, giftLines, giftFeeMinor };
})
    .setRecipient(() => process.env.ORDERS_INBOX_EMAIL?.trim() || "orders@hungerhankerings.com")
    .setFrom("{{ fromAddress }}")
    .setSubject((event) => {
    const o = event.order;
    const email = o.customer?.emailAddress?.trim();
    const suffix = email && email.length > 0 ? email : "guest / no email on file";
    return `[New order] #${o.code} — ${suffix}`;
})
    .setTemplateVars((event) => ({
    order: (0, email_plain_order_for_email_1.toPlainOrderForEmail)(event.order),
    shippingLines: event.data.shippingLines,
    giftLines: event.data.giftLines,
    giftFeeMinor: event.data.giftFeeMinor,
}));
