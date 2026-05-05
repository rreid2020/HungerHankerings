import {
  EmailEventListener,
  hydrateShippingLines,
  transformOrderLineAssetUrls,
  type EventWithAsyncData,
} from "@vendure/email-plugin";
import { Logger, OrderStateTransitionEvent } from "@vendure/core";
import { mockOrderStateTransitionEvent } from "@vendure/email-plugin/lib/src/handler/mock-events";
import { toPlainShippingLinesForEmail, type PlainShippingLineForEmail } from "./email-plain-shipping-lines";

type OrderConfirmationLoadData = { shippingLines: PlainShippingLineForEmail[] };
const loggerCtx = "OrderConfirmationEmail";

/**
 * Same as Vendure's `orderConfirmationHandler`, but `loadData` returns plain `shippingLines`
 * so `send-email` job JSON does not embed hydrated TypeORM entities.
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
    transformOrderLineAssetUrls(event.ctx, event.order, injector);
    try {
      const hydrated = await hydrateShippingLines(event.ctx, event.order, injector);
      return { shippingLines: toPlainShippingLinesForEmail(hydrated) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(
        `Shipping line hydration failed for order ${event.order.code}; sending confirmation with fallback shipping totals only. ${msg}`,
        loggerCtx,
      );
      return { shippingLines: [] };
    }
  })
  .setRecipient((event) => event.order.customer!.emailAddress)
  .setFrom("{{ fromAddress }}")
  .setSubject("Order confirmation for #{{ order.code }}")
  .setTemplateVars((event: EventWithAsyncData<OrderStateTransitionEvent, OrderConfirmationLoadData>) => ({
    order: event.order,
    shippingLines: event.data.shippingLines,
  }))
  .setMockEvent(mockOrderStateTransitionEvent);
