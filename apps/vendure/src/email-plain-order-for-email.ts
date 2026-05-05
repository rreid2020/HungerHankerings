import type { Order } from "@vendure/core";

/** Serializable subset used by `order-confirmation` and `orders-inbox-notification` templates. */
export type PlainOrderLineForEmail = {
  quantity: number;
  discountedLinePriceWithTax: number;
  featuredAsset: { preview: string } | null;
  productVariant: {
    name: string;
    sku: string;
    /** Stock templates reference `productVariant.quantity`; map ordered qty for display. */
    quantity: number;
    product: { name: string };
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
  customer: { firstName: string; lastName: string; emailAddress: string } | null;
  shippingAddress: Record<string, string> | null;
  billingAddress: Record<string, string> | null;
  lines: PlainOrderLineForEmail[];
  discounts: { description: string; amount: number }[];
  couponCodes: string[];
  taxSummary: { description: string; taxRate: number; taxBase: number; taxTotal: number }[];
  payments: { state: string; method: string; amount: number }[];
};

function localeToDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) return v;
    }
  }
  return "";
}

function plainAddress(addr: Order["shippingAddress"] | null | undefined): Record<string, string> | null {
  if (!addr) return null;
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

function plainDiscounts(
  discounts: Array<{ description?: string | null; amount?: number | null }> | undefined,
): { description: string; amount: number }[] {
  if (!discounts?.length) return [];
  return discounts.map((d) => ({
    description: String(d.description ?? ""),
    amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 0,
  }));
}

function plainLines(order: Order): PlainOrderLineForEmail[] {
  const lines = order.lines ?? [];
  return lines.map((line) => {
    const pv = line.productVariant;
    const variantName = localeToDisplayString(pv?.name);
    const productName = localeToDisplayString(pv?.product?.name);
    const preview =
      line.featuredAsset && typeof line.featuredAsset.preview === "string"
        ? line.featuredAsset.preview
        : "";
    const qty = typeof line.quantity === "number" && Number.isFinite(line.quantity) ? line.quantity : 0;
    let lineTotalTax = 0;
    try {
      const v = line.discountedLinePriceWithTax;
      lineTotalTax = typeof v === "number" && Number.isFinite(v) ? v : 0;
    } catch {
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

function plainPayments(order: Order): { state: string; method: string; amount: number }[] {
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
export function toPlainOrderForEmail(order: Order): PlainOrderForEmail {
  const cust = order.customer;
  const customer =
    cust &&
    (cust.firstName != null || cust.lastName != null || cust.emailAddress != null)
      ? {
          firstName: String(cust.firstName ?? ""),
          lastName: String(cust.lastName ?? ""),
          emailAddress: String(cust.emailAddress ?? ""),
        }
      : null;

  let taxSummary: PlainOrderForEmail["taxSummary"] = [];
  try {
    const raw = order.taxSummary ?? [];
    taxSummary = raw.map((t) => ({
      description: String(t.description ?? ""),
      taxRate: typeof t.taxRate === "number" && Number.isFinite(t.taxRate) ? t.taxRate : 0,
      taxBase: typeof t.taxBase === "number" && Number.isFinite(t.taxBase) ? t.taxBase : 0,
      taxTotal: typeof t.taxTotal === "number" && Number.isFinite(t.taxTotal) ? t.taxTotal : 0,
    }));
  } catch {
    taxSummary = [];
  }

  let discountsInput: Array<{ description?: string | null; amount?: number | null }> = [];
  try {
    discountsInput = order.discounts ?? [];
  } catch {
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
