import { Args, Query, Resolver } from "@nestjs/graphql";
import { Ctx, RequestContext } from "@vendure/core";
import { PostalCodeZoneService } from "../postal-code-zone.service";

const FALLBACK_RATE_CENTS = 1200;

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
    const prefix = country === "CA" ? postal.slice(0, 1) : "";
    const cents =
      (await this.postalZoneService.getRateCents(ctx, country, prefix)) ??
      FALLBACK_RATE_CENTS;
    return cents;
  }
}
