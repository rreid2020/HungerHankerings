import {
  EmailEventListener,
  hydrateShippingLines,
  transformOrderLineAssetUrls,
} from "@vendure/email-plugin";
import { OrderStateTransitionEvent } from "@vendure/core";
import type { Order } from "@vendure/core";

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

/** Notify internal inbox when an order payment settles (runs beside customer order-confirmation). */
export const ordersInboxNotificationHandler = new EmailEventListener("orders-inbox-notification")
  .on(OrderStateTransitionEvent)
  .filter(
    (event) => event.toState === "PaymentSettled" && event.fromState !== "Modifying",
  )
  .loadData(async ({ event, injector }) => {
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    const shippingLines = await hydrateShippingLines(event.ctx, event.order, injector);
    const giftLines = giftRowsFromOrder(event.order);
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
    order: event.order,
    shippingLines: (event as { data: { shippingLines: unknown[] } }).data.shippingLines,
    giftLines: (event as { data: { giftLines: { unitKey: string; message: string }[] } }).data.giftLines,
    giftFeeMinor: (event as { data: { giftFeeMinor: number } }).data.giftFeeMinor,
  }));
