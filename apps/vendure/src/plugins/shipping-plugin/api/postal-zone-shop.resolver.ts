import { Args, Query, Resolver } from "@nestjs/graphql";
import { Ctx, Logger, RequestContext } from "@vendure/core";
import { PostalCodeZoneService } from "../postal-code-zone.service";

const FALLBACK_RATE_CENTS = 1200;
const loggerCtx = "PostalZoneShopResolver";

@Resolver()
export class PostalZoneShopResolver {
  constructor(private postalZoneService: PostalCodeZoneService) {}

  @Query()
  async shippingQuote(
    @Ctx() ctx: RequestContext,
    @Args("countryCode") countryCode: string,
    @Args("postalCode") postalCode: string
  ): Promise<number> {
    const country = (countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const postal = (postalCode ?? "").trim().toUpperCase().replace(/\s/g, "");
    try {
      const admin = await this.postalZoneService.getAdminRateCentsByPostal(country, postal, 0);
      if (admin && typeof admin.rateCents === "number") return admin.rateCents;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`shippingQuote admin lookup failed for ${country} ${postal}: ${msg}`, loggerCtx);
    }
    try {
      const legacy = await this.postalZoneService.getRateCentsByPostal(ctx, country, postal);
      if (legacy != null && legacy > 0) return legacy;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`shippingQuote legacy lookup failed for ${country} ${postal}: ${msg}`, loggerCtx);
    }
    return FALLBACK_RATE_CENTS;
  }
}
