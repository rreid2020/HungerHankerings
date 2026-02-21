/**
 * Shipping and tax rates by country and province.
 * Edit these to match your actual rates.
 */

export type CountryCode = "CA" | "US"

/** Canadian province/territory code -> combined sales tax rate (decimal, e.g. 0.13 = 13%) */
export const TAX_RATES_CA: Record<string, number> = {
  AB: 0.05,
  BC: 0.12,
  MB: 0.12,
  NB: 0.15,
  NL: 0.15,
  NS: 0.15,
  NT: 0.05,
  NU: 0.05,
  ON: 0.13,
  PE: 0.15,
  QC: 0.14975,
  SK: 0.11,
  YT: 0.05
}

/** US state code -> sales tax rate (decimal). Add or override as needed. */
export const TAX_RATES_US: Record<string, number> = {
  // Example: some states have no sales tax on food, or different rates
  AL: 0,
  AK: 0,
  AZ: 0.056,
  AR: 0.065,
  CA: 0.0725,
  CO: 0.029,
  CT: 0.0635,
  DE: 0,
  FL: 0.06,
  GA: 0.04,
  HI: 0.04,
  ID: 0.06,
  IL: 0.0625,
  IN: 0.07,
  IA: 0.06,
  KS: 0.065,
  KY: 0.06,
  LA: 0.0445,
  ME: 0.055,
  MD: 0.06,
  MA: 0.0625,
  MI: 0.06,
  MN: 0.065,
  MS: 0.05,
  MO: 0.04225,
  MT: 0,
  NE: 0.055,
  NV: 0.0685,
  NH: 0,
  NJ: 0.06625,
  NM: 0.05125,
  NY: 0.04,
  NC: 0.03,
  ND: 0.05,
  OH: 0.0575,
  OK: 0.045,
  OR: 0,
  PA: 0.06,
  RI: 0.07,
  SC: 0.06,
  SD: 0.045,
  TN: 0.07,
  TX: 0.0625,
  UT: 0.0485,
  VT: 0.06,
  VA: 0.053,
  WA: 0.065,
  WV: 0.06,
  WI: 0.05,
  WY: 0.04
}

/** Canadian provinces for dropdown: code and name */
export const CANADIAN_PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" }
]

/** Province/state name -> code for lookup */
export const PROVINCE_NAME_TO_CODE: Record<string, string> = {
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
  Yukon: "YT"
}

/**
 * Shipping rates: country -> (province/state code -> amount in CAD) or default.
 * Use "default" for country-wide rate when province not specified.
 */
export type ShippingRatesConfig = {
  [K in CountryCode]?: { default: number; [provinceCode: string]: number }
}

export const SHIPPING_RATES: ShippingRatesConfig = {
  CA: {
    default: 12,
    AB: 10,
    BC: 11,
    MB: 10,
    NB: 14,
    NL: 16,
    NS: 14,
    NT: 20,
    NU: 22,
    ON: 11,
    PE: 14,
    QC: 12,
    SK: 10,
    YT: 20
  },
  US: {
    default: 18
  }
}

function normalizeProvinceCode(province: string, country: string): string {
  const trimmed = province.trim().toUpperCase()
  if (trimmed.length === 2) return trimmed
  const byName = PROVINCE_NAME_TO_CODE[province.trim()] ?? PROVINCE_NAME_TO_CODE[province.trim().replace(/ and /g, " & ")]
  return byName?.toUpperCase() ?? trimmed.slice(0, 2)
}

export function getShippingRate(country: string, province: string): number {
  const cc = (country?.trim().toUpperCase().slice(0, 2) || "CA") as CountryCode
  const rates = SHIPPING_RATES[cc]
  if (!rates) return SHIPPING_RATES.CA?.default ?? 0
  const code = province?.trim() ? normalizeProvinceCode(province, country) : ""
  return rates[code] ?? rates.default ?? 0
}

export function getTaxRate(country: string, province: string): number {
  const cc = country?.trim().toUpperCase().slice(0, 2) || "CA"
  const code = province?.trim() ? normalizeProvinceCode(province, country) : ""
  if (cc === "CA") return TAX_RATES_CA[code] ?? 0
  if (cc === "US") return TAX_RATES_US[code] ?? 0
  return 0
}
