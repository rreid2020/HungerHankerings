import { RequestContext } from "@vendure/core";
import { PostalCodeZoneService } from "../postal-code-zone.service";
export declare class PostalZoneShopResolver {
    private postalZoneService;
    constructor(postalZoneService: PostalCodeZoneService);
    shippingQuote(ctx: RequestContext, countryCode: string, postalCode: string): Promise<number>;
}
//# sourceMappingURL=postal-zone-shop.resolver.d.ts.map