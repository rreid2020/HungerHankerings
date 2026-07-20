import { RequestContext, Order, VendureEvent } from "@vendure/core";

/** Ops/admin-triggered resend of the customer order confirmation email. */
export class ResendOrderConfirmationEvent extends VendureEvent {
  constructor(
    public ctx: RequestContext,
    public order: Order,
  ) {
    super();
  }
}
