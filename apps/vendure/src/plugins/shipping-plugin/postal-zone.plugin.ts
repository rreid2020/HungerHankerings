import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "./postal-code-zone.service";

/**
 * Registers PostalCodeZone entity and PostalCodeZoneService for postal-code–based shipping.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [PostalCodeZone as any],
  providers: [PostalCodeZoneService],
})
export class PostalZonePlugin {}
