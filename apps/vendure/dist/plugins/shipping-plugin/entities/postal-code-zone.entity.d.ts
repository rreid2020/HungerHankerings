import { VendureEntity } from "@vendure/core";
/**
 * Shipping zone by 3-character postal prefix (Canadian FSA) or country default.
 * You set your own rate per zone. Optional city/region for display; lookup uses prefix only.
 */
export declare class PostalCodeZone extends VendureEntity {
    /** Country code (e.g. CA, US). */
    countryCode: string;
    /** 3-char FSA (e.g. K0K, M5V) or empty for country default. */
    prefix: string;
    /** Human-readable zone name (e.g. FSA K0K). */
    zoneName: string;
    /** City name when available (for display; not used in lookup). */
    city: string | null;
    /** Region/province when available (e.g. Ontario; for display). */
    region: string | null;
    /** Your shipping rate in cents (CAD). Set per zone after seed. */
    rateCents: number;
    constructor(input?: Partial<PostalCodeZone>);
}
//# sourceMappingURL=postal-code-zone.entity.d.ts.map