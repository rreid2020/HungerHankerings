export const orderEmailAdminSchemaSdl = `
  type ResendOrderConfirmationResult {
    success: Boolean!
    message: String!
    orderCode: String
    recipientEmail: String
  }

  extend type Mutation {
    resendOrderConfirmationEmail(orderCode: String!): ResendOrderConfirmationResult!
  }
`;
