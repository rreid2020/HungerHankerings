import { ID, RequestContext, TransactionalConnection } from "@vendure/core";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
/**
 * Look up shipping rate (cents) by country and postal code.
 * Canada: 3-character FSA only (e.g. K0K, M5V); if no row, use country default (prefix "").
 * US: country default only. Add rows for FSAs that need a specific rate (e.g. remote).
 */
export declare class PostalCodeZoneService {
    private connection;
    constructor(connection: TransactionalConnection);
    /** Lookup by exact prefix (used by Admin). */
    getRateCents(ctx: RequestContext, countryCode: string, prefix: string): Promise<number | null>;
    /** Lookup by full postal: Canada = 3-char FSA then default; US = default only. */
    getRateCentsByPostal(ctx: RequestContext, countryCode: string, postalCode: string): Promise<number | null>;
    findAll(ctx: RequestContext): Promise<PostalCodeZone[]>;
    updateZone(ctx: RequestContext, id: ID, rateCents: number, city?: string | null, region?: string | null): Promise<PostalCodeZone | null>;
    /** @deprecated Use updateZone. */
    updateRate(ctx: RequestContext, id: ID, rateCents: number): Promise<PostalCodeZone | null>;
}
//# sourceMappingURL=postal-code-zone.service.d.ts.map