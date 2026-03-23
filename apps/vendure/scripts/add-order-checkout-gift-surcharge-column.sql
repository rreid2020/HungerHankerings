-- One-time (optional): add Order custom field column for checkout gift Stripe surcharge.
-- Vendure now runs ensure-checkout-gift-surcharge-column on server/worker startup; use this SQL
-- only if startup ALTER fails (e.g. DB user lacks permission).
--
-- Error fixed: column order.customFieldsCheckoutgiftsurchargecents does not exist
--
-- If your table is not public."order", find it (has columns code, state, subTotalWithTax) and adjust:

ALTER TABLE public."order"
  ADD COLUMN IF NOT EXISTS "customFieldsCheckoutGiftSurchargeCents" integer NULL;
