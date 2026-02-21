-- Fix for Saleor migration discount.0052_drop_sales_constraints on PostgreSQL 18.
-- PG18 errors when dropping NOT NULL on columns that are part of a primary key.
-- This script does the same drops but skips constraints that cannot be dropped.
-- Run this against your Saleor database, then fake the migration (see DROPLET-DATABASE-AND-MIGRATIONS.md).

do $$
declare
  r record;
  tab text;
  tabs text[] := array[
    'discount_sale_collections',
    'discount_sale_categories',
    'discount_sale_products',
    'discount_sale_variants',
    'discount_salechannellisting',
    'discount_saletranslation',
    'discount_sale'
  ];
begin
  ALTER TABLE discount_orderdiscount DROP CONSTRAINT IF EXISTS
    "discount_orderdiscount_sale_id_849ebbef_fk_discount_sale_id";
  ALTER TABLE discount_checkoutlinediscount DROP CONSTRAINT IF EXISTS
    "discount_checkoutlin_sale_id_b0964e58_fk_discount_";
  ALTER TABLE discount_orderlinediscount DROP CONSTRAINT IF EXISTS
    "discount_orderlinediscount_sale_id_d95994f8_fk_discount_sale_id";

  foreach tab in array tabs loop
    for r in (
      select constraint_name
      from information_schema.table_constraints
      where table_name = tab
    ) loop
      begin
        execute format(
          'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
          tab,
          r.constraint_name
        );
      exception when others then
        null;  /* skip constraints that cannot be dropped (e.g. NOT NULL on PK in PG18) */
      end;
    end loop;
  end loop;
end;
$$;
