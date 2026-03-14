import path from "path";
import type { AdminUiExtension } from "@vendure/ui-devkit/compiler";

const extensionPath = path.join(__dirname, "ui");

export const shippingRatesAdminExtension: AdminUiExtension = {
  extensionPath,
  routes: [{ route: "shipping-rates", filePath: "routes.ts" }],
  providers: ["providers.ts"],
};
