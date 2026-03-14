import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { postalZoneAdminSchemaSdl } from "./api/postal-zone-api.extensions";
import { PostalZoneAdminResolver } from "./api/postal-zone-admin.resolver";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "./postal-code-zone.service";
import { ShippingRatesUiController } from "./shipping-rates-ui.controller";

/** Parse SDL at runtime with Vendure's graphql so schema merge accepts it. Avoid typing as graphql.DocumentNode to prevent two graphql versions (project vs @vendure/core) from conflicting in Docker. */
function postalZoneAdminSchema() {
  const { parse } = require("graphql");
  return parse(postalZoneAdminSchemaSdl) as any;
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
