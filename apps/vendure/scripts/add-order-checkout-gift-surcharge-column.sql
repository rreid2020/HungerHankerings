-- One-time (optional): add Order custom field column for checkout gift Stripe surcharge.
-- Vendure runs ensure-checkout-gift-surcharge-column on server/worker startup; use this SQL
-- only if startup ALTER fails (e.g. DB user lacks permission).
--
-- TypeORM DefaultNamingStrategy names embedded custom field columns as:
--   customFields + titleCase("checkoutGiftSurchargeCents")
-- titleCase() only capitalizes the first letter and lowercases the rest, so the real column is:
--   "customFieldsCheckoutgiftsurchargecents"
-- NOT "customFieldsCheckoutGiftSurchargeCents" (an earlier mistaken name in this repo).
--
-- Error you may see if the column name is wrong: column order.customFieldsCheckoutgiftsurchargecents does not exist
--
-- If your table is not public."order", find it (columns code, state, subTotalWithTax) and adjust.

-- Optional: rename mistaken PascalCase-middle column from an older deploy:
-- ALTER TABLE public."order"
--   RENAME COLUMN "customFieldsCheckoutGiftSurchargeCents" TO "customFieldsCheckoutgiftsurchargecents";

ALTER TABLE public."order"
  ADD COLUMN IF NOT EXISTS "customFieldsCheckoutgiftsurchargecents" integer NULL;
