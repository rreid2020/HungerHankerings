import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { postalZoneAdminSchemaSdl } from "./api/postal-zone-api.extensions";
import { PostalZoneAdminResolver } from "./api/postal-zone-admin.resolver";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "./postal-code-zone.service";
import { ShippingRatesUiController } from "./shipping-rates-ui.controller";

/** Parse SDL at runtime with Vendure's graphql so schema merge accepts it. */
function postalZoneAdminSchema(): import("graphql").DocumentNode {
  const { parse } = require("graphql");
  return parse(postalZoneAdminSchemaSdl);
}

/**
 * Registers PostalCodeZone entity and PostalCodeZoneService for postal-code–based shipping.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [PostalCodeZone as any],
  providers: [PostalCodeZoneService],
  adminApiExtensions: {
    schema: postalZoneAdminSchema,
    resolvers: [PostalZoneAdminResolver],
  },
  controllers: [ShippingRatesUiController],
})
export class PostalZonePlugin {}
