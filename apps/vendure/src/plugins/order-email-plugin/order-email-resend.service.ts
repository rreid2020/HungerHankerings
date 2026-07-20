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
import { toPlainOrderForEmail } from "../../email-plain-order-for-email";
import { loadOrderConfirmationEmailData } from "./order-confirmation-resend-email-handler";

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

function ordersInboxEmail(): string {
  return (process.env.ORDERS_INBOX_EMAIL?.trim() || "orders@hungerhankerings.com").trim();
}

function ordersInboxUsesSeparateEmailJob(): boolean {
  return (
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "true" ||
    process.env.ORDERS_INBOX_SEPARATE_EMAIL === "1"
  );
}

/**
 * Builds IntermediateEmailDetails and sends via EmailProcessor immediately.
 * Avoids EmailEventHandler.handle()'s silent `return` when filters/loadData fail.
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
      "lines.productVariant",
      "lines.productVariant.product",
      "payments",
      "shippingLines",
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

      const data = await loadOrderConfirmationEmailData(ctx, order, injector);
      const templateVars = {
        ...globals,
        order: toPlainOrderForEmail(order, String(ctx.languageCode ?? "")),
        shippingLines: data.shippingLines,
        giftLines: data.giftLines,
        giftFeeMinor: data.giftFeeMinor,
        grandTotalChargedMinor: data.grandTotalChargedMinor,
      };

      const optionalAddressFields: { bcc?: string } = {};
      if (!ordersInboxUsesSeparateEmailJob()) {
        const inbox = ordersInboxEmail();
        if (inbox && inbox.toLowerCase() !== email.toLowerCase()) {
          optionalAddressFields.bcc = inbox;
        }
      }

      const details = {
        ctx: ctx.serialize(),
        type: "order-confirmation",
        recipient: email,
        from: "{{ fromAddress }}",
        subject: `Order confirmation for #${order.code}`,
        templateFile: "body.hbs",
        templateVars,
        attachments: [],
        ...optionalAddressFields,
      };

      await emailProcessor.process(details as Parameters<EmailProcessor["process"]>[0]);

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
