"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersInboxNotificationHandler = void 0;
const email_plugin_1 = require("@vendure/email-plugin");
const core_1 = require("@vendure/core");
const email_plain_order_for_email_1 = require("./email-plain-order-for-email");
const email_plain_shipping_lines_1 = require("./email-plain-shipping-lines");
/** Matches storefront checkout `unitKey(lineId, unitIndex)` gift metadata keys. */
function parseGiftUnitKey(unitKey) {
    const lastDash = unitKey.lastIndexOf("-");
    if (lastDash < 0)
        return null;
    const lineId = unitKey.slice(0, lastDash);
    const unitStr = unitKey.slice(lastDash + 1);
    const unitIndex = Number.parseInt(unitStr, 10);
    if (!Number.isFinite(unitIndex) || String(unitIndex) !== unitStr)
        return null;
    return { lineId, unitIndex };
}
function giftLineLabel(order, unitKey) {
    const parsed = parseGiftUnitKey(unitKey);
    if (!parsed)
        return unitKey;
    const line = order.lines?.find((l) => l.id === parsed.lineId);
    if (!line)
        return unitKey;
    const pv = line.productVariant;
    const productName = pv?.product?.name?.trim() || "Line item";
    const variantName = pv?.name?.trim() || "";
    const title = variantName ? `${productName} — ${variantName}` : productName;
    const qty = line.quantity ?? 1;
    if (qty > 1) {
        return `${title} — Box ${parsed.unitIndex + 1} of ${qty}`;
    }
    return title;
}
function giftRowsFromOrder(order) {
    const payments = order.payments ?? [];
    const out = [];
    for (const p of payments) {
        const st = p.state;
        if (st !== "Settled" && st !== "Authorized")
            continue;
        const meta = p.metadata;
        const raw = meta && typeof meta.gift_by_line_unit_json === "string" ? meta.gift_by_line_unit_json : undefined;
        if (!raw?.trim())
            continue;
        try {
            const obj = JSON.parse(raw);
            for (const [key, v] of Object.entries(obj)) {
                const msg = v?.giftMessage?.trim();
                if (msg)
                    out.push({ unitKey: key, message: msg });
            }
        }
        catch {
            /* ignore */
        }
    }
    return out;
}
function giftFeeCents(order) {
    const raw = order.customFields?.checkoutGiftSurchargeCents;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}
const loggerCtx = "OrdersInboxEmail";
/** Notify internal inbox when an order payment settles (runs beside customer order-confirmation). */
exports.ordersInboxNotificationHandler = new email_plugin_1.EmailEventListener("orders-inbox-notification")
    .on(core_1.OrderStateTransitionEvent)
    .filter((event) => event.toState === "PaymentSettled" && event.fromState !== "Modifying")
    .loadData(async ({ event, injector }) => {
    (0, email_plugin_1.transformOrderLineAssetUrls)(event.ctx, event.order, injector);
    let shippingLines = [];
    try {
        const hydratedShipping = await (0, email_plugin_1.hydrateShippingLines)(event.ctx, event.order, injector);
        shippingLines = (0, email_plain_shipping_lines_1.toPlainShippingLinesForEmail)(hydratedShipping);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        core_1.Logger.warn(`Shipping line hydration failed for order ${event.order.code}; sending inbox email with fallback shipping totals only. ${msg}`, loggerCtx);
    }
    const giftRows = giftRowsFromOrder(event.order);
    const giftLines = giftRows.map((row) => ({
        ...row,
        lineLabel: giftLineLabel(event.order, row.unitKey),
    }));
    const giftFeeMinor = giftFeeCents(event.order);
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
