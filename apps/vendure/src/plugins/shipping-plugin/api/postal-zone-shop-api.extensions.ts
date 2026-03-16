/** Shop API: shipping quote by postal code (uses PostalCodeZone table). */
export const postalZoneShopSchemaSdl = `
  extend type Query {
    """Returns shipping price in cents (CAD) for the given address. Uses postal code zones (Canada: first letter; US: country default)."""
    shippingQuote(countryCode: String!, postalCode: String!): Int!
  }
`.trim();
