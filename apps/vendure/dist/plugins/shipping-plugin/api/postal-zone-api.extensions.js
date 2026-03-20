"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postalZoneAdminSchemaSdl = void 0;
/** SDL for admin API extension. Parsed at runtime with Vendure's graphql to avoid version mismatch. */
exports.postalZoneAdminSchemaSdl = `
  type PostalCodeZone {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    countryCode: String!
    prefix: String!
    zoneName: String!
    city: String
    region: String
    rateCents: Int!
  }

  extend type Query {
    postalCodeZones: [PostalCodeZone!]!
  }

  extend type Mutation {
    updatePostalCodeZone(id: ID!, rateCents: Int!, city: String, region: String): PostalCodeZone
  }
`.trim();
