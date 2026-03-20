import { RequestContext } from "@vendure/core";
import { PostalCodeZone } from "../entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "../postal-code-zone.service";
export declare class PostalZoneAdminResolver {
    private postalZoneService;
    constructor(postalZoneService: PostalCodeZoneService);
    postalCodeZones(ctx: RequestContext): Promise<PostalCodeZone[]>;
    updatePostalCodeZone(ctx: RequestContext, id: string, rateCents: number, city?: string, region?: string): Promise<PostalCodeZone | null>;
}
//# sourceMappingURL=postal-zone-admin.resolver.d.ts.map