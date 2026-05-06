import { EmailEventListener, transformOrderLineAssetUrls, type EventWithAsyncData } from "@vendure/email-plugin";
import { Logger, OrderStateTransitionEvent } from "@vendure/core";
import { hydrateOrderForEmail } from "./email-hydrate-order";
import { buildGiftLinesForEmail, giftFeeCents } from "./email-order-gift-data";
import { toPlainOrderForEmail } from "./email-plain-order-for-email";
import type { PlainShippingLineForEmail } from "./email-plain-shipping-lines";
import { loadShippingLinesForEmailPlain } from "./email-shipping-lines";

type OrdersInboxLoadData = {
  shippingLines: PlainShippingLineForEmail[];
  giftLines: ReturnType<typeof buildGiftLinesForEmail>;
  giftFeeMinor: number;
};
const loggerCtx = "OrdersInboxEmail";

/**
 * Notify internal inbox when an order payment settles.
 * Registered only when `ORDERS_INBOX_SEPARATE_EMAIL=true`; otherwise the inbox receives a **BCC** on the
 * customer order confirmation (see `order-confirmation-email-handler.ts`).
 */
export const ordersInboxNotificationHandler = new EmailEventListener("orders-inbox-notification")
  .on(OrderStateTransitionEvent)
  .filter(
    (event) => event.toState === "PaymentSettled" && event.fromState !== "Modifying",
  )
  .loadData(async ({ event, injector }) => {
    await hydrateOrderForEmail(event.ctx, event.order, injector);
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    let shippingLines: PlainShippingLineForEmail[] = [];
    try {
      shippingLines = await loadShippingLinesForEmailPlain(event.ctx, event.order, injector);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(
        `Shipping lines for inbox email failed for order ${event.order.code}; continuing without shipping breakdown. ${msg}`,
        loggerCtx,
      );
    }
    const giftLines = buildGiftLinesForEmail(event.order);
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
    order: toPlainOrderForEmail(event.order),
    shippingLines: event.data.shippingLines,
    giftLines: event.data.giftLines,
    giftFeeMinor: event.data.giftFeeMinor,
  }));
