import { RequestContext, TransactionalConnection } from "@vendure/core";
/**
 * Look up shipping rate (cents) by country and postal code first letter.
 * For CA uses prefix; for US uses country default (prefix empty).
 */
export declare class PostalCodeZoneService {
    private connection;
    constructor(connection: TransactionalConnection);
    getRateCents(ctx: RequestContext, countryCode: string, prefix: string): Promise<number | null>;
}
//# sourceMappingURL=postal-code-zone.service.d.ts.map