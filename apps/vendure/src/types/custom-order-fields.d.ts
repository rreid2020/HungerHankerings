declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomOrderFields {
    /** Minor units (e.g. cents) added to Stripe PI; set at storefront checkout. */
    checkoutGiftSurchargeCents?: number | null;
    /** JSON map of unitKey → { giftMessage } from checkout gift options. */
    giftByLineUnitJson?: string | null;
    /** Human-readable gift card messages for Admin / fulfillment. */
    giftMessages?: string | null;
  }
}

export {};
