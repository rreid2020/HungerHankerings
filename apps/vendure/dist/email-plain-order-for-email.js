"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainOrderForEmail = toPlainOrderForEmail;
function localeToDisplayString(value) {
    if (value == null)
        return "";
    if (typeof value === "string")
        return value;
    if (typeof value === "object") {
        for (const v of Object.values(value)) {
            if (typeof v === "string" && v.length > 0)
                return v;
        }
    }
    return "";
}
function plainAddress(addr) {
    if (!addr)
        return null;
    return {
        fullName: String(addr.fullName ?? ""),
        company: String(addr.company ?? ""),
        streetLine1: String(addr.streetLine1 ?? ""),
        streetLine2: String(addr.streetLine2 ?? ""),
        city: String(addr.city ?? ""),
        province: String(addr.province ?? ""),
        postalCode: String(addr.postalCode ?? ""),
        country: String(addr.country ?? ""),
        phoneNumber: String(addr.phoneNumber ?? ""),
    };
}
function plainDiscounts(discounts) {
    if (!discounts?.length)
        return [];
    return discounts.map((d) => ({
        description: String(d.description ?? ""),
        amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 0,
    }));
}
function plainLines(order) {
    const lines = order.lines ?? [];
    return lines.map((line) => {
        const pv = line.productVariant;
        const variantName = localeToDisplayString(pv?.name);
        const productName = localeToDisplayString(pv?.product?.name);
        const preview = line.featuredAsset && typeof line.featuredAsset.preview === "string"
            ? line.featuredAsset.preview
            : "";
        const qty = typeof line.quantity === "number" && Number.isFinite(line.quantity) ? line.quantity : 0;
        let lineTotalTax = 0;
        try {
            const v = line.discountedLinePriceWithTax;
            lineTotalTax = typeof v === "number" && Number.isFinite(v) ? v : 0;
        }
        catch {
            lineTotalTax = 0;
        }
        return {
            quantity: qty,
            discountedLinePriceWithTax: lineTotalTax,
            featuredAsset: preview ? { preview } : null,
            productVariant: {
                name: variantName,
                sku: String(pv?.sku ?? ""),
                quantity: qty,
                product: { name: productName || variantName },
            },
        };
    });
}
function plainPayments(order) {
    const payments = order.payments ?? [];
    return payments.map((p) => ({
        state: String(p.state ?? ""),
        method: String(p.method ?? ""),
        amount: typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : 0,
    }));
}
/**
 * Builds a JSON-friendly order snapshot for email templates so `send-email` jobs do not embed
 * TypeORM graphs (cycles, huge payloads, serialization failures).
 */
function toPlainOrderForEmail(order) {
    const cust = order.customer;
    const customer = cust &&
        (cust.firstName != null || cust.lastName != null || cust.emailAddress != null)
        ? {
            firstName: String(cust.firstName ?? ""),
            lastName: String(cust.lastName ?? ""),
            emailAddress: String(cust.emailAddress ?? ""),
        }
        : null;
    let taxSummary = [];
    try {
        const raw = order.taxSummary ?? [];
        taxSummary = raw.map((t) => ({
            description: String(t.description ?? ""),
            taxRate: typeof t.taxRate === "number" && Number.isFinite(t.taxRate) ? t.taxRate : 0,
            taxBase: typeof t.taxBase === "number" && Number.isFinite(t.taxBase) ? t.taxBase : 0,
            taxTotal: typeof t.taxTotal === "number" && Number.isFinite(t.taxTotal) ? t.taxTotal : 0,
        }));
    }
    catch {
        taxSummary = [];
    }
    let discountsInput = [];
    try {
        discountsInput = order.discounts ?? [];
    }
    catch {
        discountsInput = [];
    }
    const couponCodes = Array.isArray(order.couponCodes)
        ? order.couponCodes.map((c) => String(c))
        : [];
    return {
        code: String(order.code ?? ""),
        state: String(order.state ?? ""),
        orderPlacedAt: order.orderPlacedAt,
        currencyCode: String(order.currencyCode ?? ""),
        subTotal: order.subTotal ?? 0,
        subTotalWithTax: order.subTotalWithTax ?? 0,
        shipping: order.shipping ?? 0,
        shippingWithTax: order.shippingWithTax ?? 0,
        total: order.total ?? 0,
        totalWithTax: order.totalWithTax ?? 0,
        customer,
        shippingAddress: plainAddress(order.shippingAddress),
        billingAddress: plainAddress(order.billingAddress),
        lines: plainLines(order),
        discounts: plainDiscounts(discountsInput),
        couponCodes,
        taxSummary,
        payments: plainPayments(order),
    };
}
