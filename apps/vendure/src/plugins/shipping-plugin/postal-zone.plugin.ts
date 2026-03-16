import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { postalZoneAdminSchemaSdl } from "./api/postal-zone-api.extensions";
import { postalZoneShopSchemaSdl } from "./api/postal-zone-shop-api.extensions";
import { PostalZoneAdminResolver } from "./api/postal-zone-admin.resolver";
import { PostalZoneShopResolver } from "./api/postal-zone-shop.resolver";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "./postal-code-zone.service";
import { ShippingRatesUiController } from "./shipping-rates-ui.controller";

/** Parse SDL at runtime with Vendure's graphql so schema merge accepts it. */
function postalZoneAdminSchema(): import("graphql").DocumentNode {
  const { parse } = require("graphql");
  return parse(postalZoneAdminSchemaSdl);
}

function postalZoneShopSchema(): import("graphql").DocumentNode {
  const { parse } = require("graphql");
  return parse(postalZoneShopSchemaSdl);
}

/**
 * Registers PostalCodeZone entity and PostalCodeZoneService for postal-code–based shipping.
 */
@VendurePlugin({
  compatibility: '^2.0.0',
  imports: [PluginCommonModule],
  entities: [PostalCodeZone as any],
  providers: [PostalCodeZoneService],
  adminApiExtensions: {
    schema: postalZoneAdminSchema,
    resolvers: [PostalZoneAdminResolver],
  },
  shopApiExtensions: {
    schema: postalZoneShopSchema,
    resolvers: [PostalZoneShopResolver],
  },
  controllers: [ShippingRatesUiController],
})
export class PostalZonePlugin {}
