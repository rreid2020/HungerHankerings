import type { DocumentNode } from "graphql";
import gql from "graphql-tag";

export const postalZoneAdminSchema: DocumentNode = gql`
  type PostalCodeZone {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    countryCode: String!
    prefix: String!
    zoneName: String!
    rateCents: Int!
  }

  extend type Query {
    postalCodeZones: [PostalCodeZone!]!
  }

  extend type Mutation {
    updatePostalCodeZone(id: ID!, rateCents: Int!): PostalCodeZone
  }
`;
