import {
  EmailEventListener,
  transformOrderLineAssetUrls,
  type EventWithAsyncData,
} from "@vendure/email-plugin";
import { Logger, type Injector, type Order, type RequestContext } from "@vendure/core";
import { hydrateOrderForEmail } from "../../email-hydrate-order";
import { buildGiftLinesForEmail, giftFeeCents } from "../../email-order-gift-data";
import { toPlainOrderForEmail } from "../../email-plain-order-for-email";
import type { PlainShippingLineForEmail } from "../../email-plain-shipping-lines";
import { loadShippingLinesForEmailPlain } from "../../email-shipping-lines";
import { ResendOrderConfirmationEvent } from "./resend-order-confirmation.event";

export type OrderConfirmationLoadData = {
  shippingLines: PlainShippingLineForEmail[];
  giftLines: ReturnType<typeof buildGiftLinesForEmail>;
  giftFeeMinor: number;
  grandTotalChargedMinor: number;
};

const loggerCtx = "OrderConfirmationResendEmail";

function ordersInboxEmail(): string {
  return (process.env.ORDERS_INBOX_EMAIL?.trim() || "orders@hungerhankerings.com").trim();
}

function ordersInboxUsesSeparateEmailJob(): boolean {
  return (
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "true" ||
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "1"
  );
}

export async function loadOrderConfirmationEmailData(
  ctx: RequestContext,
  order: Order,
  injector: Injector,
): Promise<OrderConfirmationLoadData> {
  await hydrateOrderForEmail(ctx, order, injector);
  transformOrderLineAssetUrls(ctx, order, injector);
  try {
    const shippingLines = await loadShippingLinesForEmailPlain(ctx, order, injector);
    const giftFeeMinor = giftFeeCents(order);
    const giftLines = buildGiftLinesForEmail(order);
    const grandTotalChargedMinor = (order.totalWithTax ?? 0) + giftFeeMinor;
    return { shippingLines, giftFeeMinor, giftLines, grandTotalChargedMinor };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.warn(
      `Shipping lines for email failed for order ${order.code}; sending confirmation without shipping breakdown. ${msg}`,
      loggerCtx,
    );
  }
  const giftFeeMinor = giftFeeCents(order);
  const giftLines = buildGiftLinesForEmail(order);
  const grandTotalChargedMinor = (order.totalWithTax ?? 0) + giftFeeMinor;
  return { shippingLines: [], giftFeeMinor, giftLines, grandTotalChargedMinor };
}

/**
 * Same MJML templates as checkout confirmation (`order-confirmation/`), triggered by
 * {@link ResendOrderConfirmationEvent} from the ops Admin mutation.
 */
export const orderConfirmationResendEmailHandler = new EmailEventListener("order-confirmation")
  .on(ResendOrderConfirmationEvent)
  .filter((event) => !!event.order.customer?.emailAddress)
  .loadData(async ({ event, injector }) =>
    loadOrderConfirmationEmailData(event.ctx, event.order, injector),
  )
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
  .setTemplateVars(
    (event: EventWithAsyncData<ResendOrderConfirmationEvent, OrderConfirmationLoadData>) => ({
      order: toPlainOrderForEmail(event.order, String(event.ctx.languageCode ?? "")),
      shippingLines: event.data.shippingLines,
      giftLines: event.data.giftLines,
      giftFeeMinor: event.data.giftFeeMinor,
      grandTotalChargedMinor: event.data.grandTotalChargedMinor,
    }),
  );
