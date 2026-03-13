import { ID, RequestContext, TransactionalConnection } from "@vendure/core";
import { PostalCodeZone } from "./entities/postal-code-zone.entity";
/**
 * Look up shipping rate (cents) by country and postal code first letter.
 * For CA uses prefix; for US uses country default (prefix empty).
 */
export declare class PostalCodeZoneService {
    private connection;
    constructor(connection: TransactionalConnection);
    getRateCents(ctx: RequestContext, countryCode: string, prefix: string): Promise<number | null>;
    findAll(ctx: RequestContext): Promise<PostalCodeZone[]>;
    updateRate(ctx: RequestContext, id: ID, rateCents: number): Promise<PostalCodeZone | null>;
}
//# sourceMappingURL=postal-code-zone.service.d.ts.map