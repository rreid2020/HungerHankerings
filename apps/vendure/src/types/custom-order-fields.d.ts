declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomOrderFields {
    /** Minor units (e.g. cents) added to Stripe PI; set at storefront checkout. */
    checkoutGiftSurchargeCents?: number | null;
  }
}

export {};
