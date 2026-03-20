"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postalZoneShopSchemaSdl = void 0;
/** Shop API: shipping quote by postal code (uses PostalCodeZone table). */
exports.postalZoneShopSchemaSdl = `
  extend type Query {
    """Returns shipping price in cents (CAD) for the given address. Uses postal code zones (Canada: first letter; US: country default)."""
    shippingQuote(countryCode: String!, postalCode: String!): Int!
  }
`.trim();
