import {
  EmailEventListener,
  hydrateShippingLines,
  transformOrderLineAssetUrls,
  type EventWithAsyncData,
} from "@vendure/email-plugin";
import { OrderStateTransitionEvent } from "@vendure/core";
import type { Order } from "@vendure/core";
import { toPlainShippingLinesForEmail, type PlainShippingLineForEmail } from "./email-plain-shipping-lines";

/** Matches storefront checkout `unitKey(lineId, unitIndex)` gift metadata keys. */
function parseGiftUnitKey(unitKey: string): { lineId: string; unitIndex: number } | null {
  const lastDash = unitKey.lastIndexOf("-");
  if (lastDash < 0) return null;
  const lineId = unitKey.slice(0, lastDash);
  const unitStr = unitKey.slice(lastDash + 1);
  const unitIndex = Number.parseInt(unitStr, 10);
  if (!Number.isFinite(unitIndex) || String(unitIndex) !== unitStr) return null;
  return { lineId, unitIndex };
}

function giftLineLabel(order: Order, unitKey: string): string {
  const parsed = parseGiftUnitKey(unitKey);
  if (!parsed) return unitKey;
  const line = order.lines?.find((l) => l.id === parsed.lineId);
  if (!line) return unitKey;
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

function giftRowsFromOrder(order: Order): { unitKey: string; message: string }[] {
  const payments = order.payments ?? [];
  const out: { unitKey: string; message: string }[] = [];
  for (const p of payments) {
    const st = p.state;
    if (st !== "Settled" && st !== "Authorized") continue;
    const meta = p.metadata as Record<string, unknown> | null | undefined;
    const raw =
      meta && typeof meta.gift_by_line_unit_json === "string" ? meta.gift_by_line_unit_json : undefined;
    if (!raw?.trim()) continue;
    try {
      const obj = JSON.parse(raw) as Record<string, { giftMessage?: string }>;
      for (const [key, v] of Object.entries(obj)) {
        const msg = v?.giftMessage?.trim();
        if (msg) out.push({ unitKey: key, message: msg });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function giftFeeCents(order: Order): number {
  const raw = order.customFields?.checkoutGiftSurchargeCents;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

type OrdersInboxLoadData = {
  shippingLines: PlainShippingLineForEmail[];
  giftLines: { unitKey: string; message: string; lineLabel: string }[];
  giftFeeMinor: number;
};

/** Notify internal inbox when an order payment settles (runs beside customer order-confirmation). */
export const ordersInboxNotificationHandler = new EmailEventListener("orders-inbox-notification")
  .on(OrderStateTransitionEvent)
  .filter(
    (event) => event.toState === "PaymentSettled" && event.fromState !== "Modifying",
  )
  .loadData(async ({ event, injector }) => {
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    const hydratedShipping = await hydrateShippingLines(event.ctx, event.order, injector);
    const shippingLines = toPlainShippingLinesForEmail(hydratedShipping);
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
  .setTemplateVars((event: EventWithAsyncData<OrderStateTransitionEvent, OrdersInboxLoadData>) => ({
    order: event.order,
    shippingLines: event.data.shippingLines,
    giftLines: event.data.giftLines,
    giftFeeMinor: event.data.giftFeeMinor,
  }));
