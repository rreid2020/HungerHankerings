import { Injectable } from "@nestjs/common";
import {
  EventBus,
  Logger,
  Order,
  OrderService,
  OrderStateTransitionEvent,
  RequestContext,
} from "@vendure/core";

const loggerCtx = "OrderEmailResend";

export type ResendOrderConfirmationResult = {
  success: boolean;
  message: string;
  orderCode: string | null;
  recipientEmail: string | null;
};

@Injectable()
export class OrderEmailResendService {
  constructor(
    private orderService: OrderService,
    private eventBus: EventBus,
  ) {}

  async resendConfirmation(ctx: RequestContext, orderCode: string): Promise<ResendOrderConfirmationResult> {
    const code = orderCode.trim();
    if (!code) {
      return {
        success: false,
        message: "Order code is required",
        orderCode: null,
        recipientEmail: null,
      };
    }

    const order = await this.orderService.findOneByCode(ctx, code, [
      "customer",
      "lines",
      "payments",
    ]);
    if (!order) {
      return {
        success: false,
        message: `Order ${code} was not found`,
        orderCode: code,
        recipientEmail: null,
      };
    }

    const email = order.customer?.emailAddress?.trim() || "";
    if (!order.customer || !email) {
      return {
        success: false,
        message: "Order has no customer email address",
        orderCode: order.code,
        recipientEmail: null,
      };
    }

    if (!this.canResend(order)) {
      return {
        success: false,
        message: `Order ${order.code} is not eligible for confirmation resend (state: ${order.state})`,
        orderCode: order.code,
        recipientEmail: email,
      };
    }

    // Re-publish the same event the EmailPlugin listens for. Does not change order state.
    // fromState !== "Modifying" so the existing confirmation filter accepts the event.
    this.eventBus.publish(
      new OrderStateTransitionEvent("ArrangingPayment", "PaymentSettled", ctx, order),
    );

    Logger.info(
      `Queued order confirmation resend for ${order.code} → ${email} (ops admin)`,
      loggerCtx,
    );

    return {
      success: true,
      message: `Confirmation email queued for ${email}`,
      orderCode: order.code,
      recipientEmail: email,
    };
  }

  private canResend(order: Order): boolean {
    const state = String(order.state || "").toLowerCase();
    if (state.includes("cancel")) return false;
    if (state === "paymentsettled") return true;
    if (
      state.includes("shipped") ||
      state.includes("delivered") ||
      state.includes("fulfill")
    ) {
      return true;
    }
    const payments = order.payments ?? [];
    return payments.some((p) => String(p.state || "").toLowerCase().includes("settled"));
  }
}
