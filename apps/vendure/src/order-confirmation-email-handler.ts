import { EmailEventListener, transformOrderLineAssetUrls, type EventWithAsyncData } from "@vendure/email-plugin";
import { Logger, OrderStateTransitionEvent } from "@vendure/core";
import { mockOrderStateTransitionEvent } from "@vendure/email-plugin/lib/src/handler/mock-events";
import { hydrateOrderForEmail } from "./email-hydrate-order";
import { buildGiftLinesForEmail, giftFeeCents } from "./email-order-gift-data";
import { toPlainOrderForEmail } from "./email-plain-order-for-email";
import type { PlainShippingLineForEmail } from "./email-plain-shipping-lines";
import { loadShippingLinesForEmailPlain } from "./email-shipping-lines";

type OrderConfirmationLoadData = {
  shippingLines: PlainShippingLineForEmail[];
  giftLines: ReturnType<typeof buildGiftLinesForEmail>;
  giftFeeMinor: number;
  /** Matches Stripe charge: Vendure {@link Order.totalWithTax} plus gift add-on when not on order lines. */
  grandTotalChargedMinor: number;
};
const loggerCtx = "OrderConfirmationEmail";

function ordersInboxEmail(): string {
  return (process.env.ORDERS_INBOX_EMAIL?.trim() || "orders@hungerhankerings.com").trim();
}

/** When true, ops copy uses {@link ordersInboxNotificationHandler} only (rich template); no BCC here. */
function ordersInboxUsesSeparateEmailJob(): boolean {
  return (
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "true" ||
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "1"
  );
}

/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
 *
 * By default, the store inbox (`ORDERS_INBOX_EMAIL` or orders@hungerhankerings.com) is **BCC** on this
 * email so ops receive the same confirmation as the customer in **one** SMTP send (avoids a second job
 * failing silently). Set `ORDERS_INBOX_SEPARATE_EMAIL=true` to use the dedicated inbox handler and template instead (no BCC).
 */
export const orderConfirmationEmailHandler = new EmailEventListener("order-confirmation")
  .on(OrderStateTransitionEvent)
  .filter(
    (event) =>
      event.toState === "PaymentSettled" &&
      event.fromState !== "Modifying" &&
      !!event.order.customer,
  )
  .loadData(async ({ event, injector }) => {
    await hydrateOrderForEmail(event.ctx, event.order, injector);
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    try {
      const shippingLines = await loadShippingLinesForEmailPlain(event.ctx, event.order, injector);
      const giftFeeMinor = giftFeeCents(event.order);
      const giftLines = buildGiftLinesForEmail(event.order);
      const grandTotalChargedMinor = (event.order.totalWithTax ?? 0) + giftFeeMinor;
      return { shippingLines, giftFeeMinor, giftLines, grandTotalChargedMinor };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(
        `Shipping lines for email failed for order ${event.order.code}; sending confirmation without shipping breakdown. ${msg}`,
        loggerCtx,
      );
    }
    const giftFeeMinor = giftFeeCents(event.order);
    const giftLines = buildGiftLinesForEmail(event.order);
    const grandTotalChargedMinor = (event.order.totalWithTax ?? 0) + giftFeeMinor;
    return { shippingLines: [], giftFeeMinor, giftLines, grandTotalChargedMinor };
  })
  .setRecipient((event) => event.order.customer!.emailAddress)
  .setOptionalAddressFields((event) => {
    if (ordersInboxUsesSeparateEmailJob()) {
      return {};
    }
    const inbox = ordersInboxEmail();
    const customer = event.order.customer!.emailAddress.trim().toLowerCase();
    if (!inbox || inbox.toLowerCase() === customer) {
      return {};
    }
    return { bcc: inbox };
  })
  .setFrom("{{ fromAddress }}")
  .setSubject("Order confirmation for #{{ order.code }}")
  .setTemplateVars((event: EventWithAsyncData<OrderStateTransitionEvent, OrderConfirmationLoadData>) => ({
    order: toPlainOrderForEmail(event.order),
    shippingLines: event.data.shippingLines,
    giftLines: event.data.giftLines,
    giftFeeMinor: event.data.giftFeeMinor,
    grandTotalChargedMinor: event.data.grandTotalChargedMinor,
  }))
  .setMockEvent(mockOrderStateTransitionEvent);
