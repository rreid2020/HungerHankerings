import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { orderEmailAdminSchemaSdl } from "./api/order-email-api.extensions";
import { OrderEmailAdminResolver } from "./api/order-email-admin.resolver";
import { OrderEmailResendService } from "./order-email-resend.service";

function orderEmailAdminSchema(): import("graphql").DocumentNode {
  const { parse } = require("graphql");
  return parse(orderEmailAdminSchemaSdl);
}

/**
 * Admin API mutation to re-queue the customer order confirmation email
 * without changing order state (publishes a synthetic PaymentSettled transition event).
 */
@VendurePlugin({
  compatibility: "^2.0.0",
  imports: [PluginCommonModule],
  providers: [OrderEmailResendService],
  adminApiExtensions: {
    schema: orderEmailAdminSchema,
    resolvers: [OrderEmailAdminResolver],
  },
})
export class OrderEmailPlugin {}
