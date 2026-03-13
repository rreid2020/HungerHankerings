"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postalZoneAdminSchema = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.postalZoneAdminSchema = (0, graphql_tag_1.default) `
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
