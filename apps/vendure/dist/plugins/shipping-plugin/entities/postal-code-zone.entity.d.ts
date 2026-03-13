import { VendureEntity } from "@vendure/core";
/**
 * Shipping rate by postal code prefix (e.g. first letter in Canada).
 * Seeded with Canadian first-letter zones; one row per prefix or "default" for country.
 */
export declare class PostalCodeZone extends VendureEntity {
    /** Country code (e.g. CA, US). */
    countryCode: string;
    /** First character of postal code (e.g. M, T) or empty for country default. */
    prefix: string;
    /** Human-readable zone name (e.g. Toronto Metro, Alberta). */
    zoneName: string;
    /** Shipping rate in cents (CAD). */
    rateCents: number;
    constructor(input?: Partial<PostalCodeZone>);
}
//# sourceMappingURL=postal-code-zone.entity.d.ts.map