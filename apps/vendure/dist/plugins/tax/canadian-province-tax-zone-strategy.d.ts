import type { Channel, Order, RequestContext, Zone } from "@vendure/core";
/**
 * Tax zone strategy that selects a zone based on Canadian province when the
 * order's shipping address is in Canada. This allows different tax rates per
 * province (e.g. Ontario 13% HST, Alberta 5% GST, Quebec 14.975%).
 *
 * Zone naming in Admin:
 * - Create one zone per province named exactly "CA-XX" (e.g. "CA-ON", "CA-QC", "CA-AB").
 * - Add the country "Canada" to each of those zones.
 * - Create a fallback zone named "Canada" containing Canada (used when province is missing or unknown).
 * - Create tax rates in Settings → Tax rates for each zone (Standard 13% for CA-ON, 5% for CA-AB, etc.).
 *
 * When there is no order (e.g. product listing) or the address is not in Canada,
 * the channel's default tax zone is used.
 */
export declare const canadianProvinceTaxZoneStrategy: {
    determineTaxZone(ctx: RequestContext, zones: Zone[], channel: Channel, order?: Order): Zone | undefined;
};
//# sourceMappingURL=canadian-province-tax-zone-strategy.d.ts.map