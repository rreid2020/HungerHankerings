import type { Channel, Order, RequestContext, TaxZoneStrategy, Zone } from "@vendure/core";

/**
 * Canadian province/territory name or variant -> 2-letter code.
 * Used to normalize shipping address province to zone name "CA-XX".
 */
const PROVINCE_TO_CODE: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Newfoundland & Labrador": "NL",
  "Nova Scotia": "NS",
  "Northwest Territories": "NT",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  Yukon: "YT",
  // 2-letter codes pass through
  AB: "AB", BC: "BC", MB: "MB", NB: "NB", NL: "NL", NS: "NS",
  NT: "NT", NU: "NU", ON: "ON", PE: "PE", QC: "QC", SK: "SK", YT: "YT",
};

function normalizeCanadianProvince(province: string | null | undefined): string {
  if (!province || typeof province !== "string") return "";
  const trimmed = province.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const byName = PROVINCE_TO_CODE[trimmed] ?? PROVINCE_TO_CODE[trimmed.replace(/\s+and\s+/gi, " & ")];
  return byName?.toUpperCase() ?? trimmed.slice(0, 2).toUpperCase();
}

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
export const canadianProvinceTaxZoneStrategy = new (class implements TaxZoneStrategy {
  determineTaxZone(
    ctx: RequestContext,
    zones: Zone[],
    channel: Channel,
    order?: Order
  ): Zone | undefined {
    const defaultZone = channel.defaultTaxZone ?? zones[0];
    if (!defaultZone) return undefined;

    if (!order?.shippingAddress) return defaultZone;

    const countryCode = (order.shippingAddress as { countryCode?: string }).countryCode?.toUpperCase();
    const province = (order.shippingAddress as { province?: string; countryArea?: string }).province
      ?? (order.shippingAddress as { province?: string; countryArea?: string }).countryArea;

    if (countryCode === "CA") {
      const code = normalizeCanadianProvince(province);
      if (code) {
        const zoneName = `CA-${code}`;
        const provinceZone = zones.find((z) => z.name === zoneName);
        if (provinceZone) return provinceZone;
      }
      const canadaZone = zones.find((z) => z.name === "Canada");
      if (canadaZone) return canadaZone;
    }

    return defaultZone;
  }
})();
