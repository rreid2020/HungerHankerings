import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  Injector,
  Logger,
  Order,
  OrderService,
  RequestContext,
} from "@vendure/core";
import { EmailProcessor } from "@vendure/email-plugin/lib/src/email-processor";
import { EMAIL_PLUGIN_OPTIONS } from "@vendure/email-plugin/lib/src/constants";
import { orderConfirmationResendEmailHandler } from "./order-confirmation-resend-email-handler";
import { ResendOrderConfirmationEvent } from "./resend-order-confirmation.event";

const loggerCtx = "OrderEmailResend";

export type ResendOrderConfirmationResult = {
  success: boolean;
  message: string;
  orderCode: string | null;
  recipientEmail: string | null;
};

type EmailPluginOptionsShape = {
  globalTemplateVars?:
    | Record<string, unknown>
    | ((
        c: RequestContext,
        injector: Injector,
      ) => Promise<Record<string, unknown>> | Record<string, unknown>);
};

/**
 * Sends the customer order confirmation immediately via EmailProcessor (same renderer/SMTP
 * path as the worker), so ops gets a real success/failure instead of fire-and-forget EventBus.
 */
@Injectable()
export class OrderEmailResendService {
  constructor(
    private orderService: OrderService,
    private moduleRef: ModuleRef,
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

    try {
      const emailProcessor = this.moduleRef.get(EmailProcessor, { strict: false });
      const options = this.moduleRef.get(EMAIL_PLUGIN_OPTIONS, {
        strict: false,
      }) as EmailPluginOptionsShape;

      if (!emailProcessor || typeof emailProcessor.process !== "function") {
        return {
          success: false,
          message: "Email plugin is not available on this server process",
          orderCode: order.code,
          recipientEmail: email,
        };
      }

      const injector = new Injector(this.moduleRef);
      let globals: Record<string, unknown> = {};
      if (typeof options?.globalTemplateVars === "function") {
        globals = await options.globalTemplateVars(ctx, injector);
      } else if (options?.globalTemplateVars && typeof options.globalTemplateVars === "object") {
        globals = options.globalTemplateVars;
      }

      const event = new ResendOrderConfirmationEvent(ctx, order);
      const details = await orderConfirmationResendEmailHandler.handle(
        event as Parameters<typeof orderConfirmationResendEmailHandler.handle>[0],
        globals,
        injector,
      );
      if (!details) {
        return {
          success: false,
          message: "Email handler did not produce a message (check customer/email filters)",
          orderCode: order.code,
          recipientEmail: email,
        };
      }

      await emailProcessor.process(details);

      Logger.info(`Sent order confirmation resend for ${order.code} → ${email} (ops admin)`, loggerCtx);

      return {
        success: true,
        message: `Confirmation email sent to ${email}`,
        orderCode: order.code,
        recipientEmail: email,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error(`Failed to resend confirmation for ${order.code}: ${msg}`, loggerCtx);
      return {
        success: false,
        message: `Failed to send confirmation: ${msg}`,
        orderCode: order.code,
        recipientEmail: email,
      };
    }
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
