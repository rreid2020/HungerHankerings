-- One-time: add Order custom field column for checkout gift Stripe surcharge.
-- TypeORM / Vendure use quoted camelCase column names.
-- Run against your Vendure Postgres DB if you deploy with synchronize:false and see:
--   column order.customFieldsCheckoutgiftsurchargecents does not exist
--
-- Adjust schema if not "public". Table is usually "order" (quoted).

ALTER TABLE public."order"
  ADD COLUMN IF NOT EXISTS "customFieldsCheckoutGiftSurchargeCents" integer NULL;
