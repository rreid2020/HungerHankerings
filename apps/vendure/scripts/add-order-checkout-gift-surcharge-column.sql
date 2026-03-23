-- One-time (optional): add Order custom field column for checkout gift Stripe surcharge.
-- Vendure now runs ensure-checkout-gift-surcharge-column on server/worker startup; use this SQL
-- only if startup ALTER fails (e.g. DB user lacks permission).
--
-- Error fixed: column order.customFieldsCheckoutgiftsurchargecents does not exist
--
-- Postgres folds unquoted identifiers to lowercase. If the column was added without quotes,
-- it may be stored as customfieldscheckoutgiftsurchargecents while TypeORM queries
-- "customFieldsCheckoutGiftSurchargeCents". Server startup runs ensure-checkout-gift-surcharge-column
-- which renames mis-cased columns automatically; use the RENAME below only for a manual fix.
--
-- If your table is not public."order", find it (has columns code, state, subTotalWithTax) and adjust:

-- Optional: fix casing only (run if column exists as all-lowercase, skip if ADD already succeeded):
-- ALTER TABLE public."order"
--   RENAME COLUMN customfieldscheckoutgiftsurchargecents TO "customFieldsCheckoutGiftSurchargeCents";

ALTER TABLE public."order"
  ADD COLUMN IF NOT EXISTS "customFieldsCheckoutGiftSurchargeCents" integer NULL;
