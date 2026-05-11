# Canadian FSA Shipping Rates

Shipping rates are managed in the custom ops portal, not in Vendure Admin.

## Admin Database

The module stores configuration in the existing `hungerhankeringsadmin` PostgreSQL database through the storefront Prisma schema:

- `shipping_zones`
- `postal_fsa_regions`
- `shipping_fsa_overrides`
- `shipping_rate_audit_log`

Apply migrations against the admin DB:

```bash
cd storefront
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/hungerhankeringsadmin" npx prisma migrate deploy
```

On App Platform, keep Vendure on `DB_NAME=vendure` and set:

```text
LEADS_DATABASE_NAME=hungerhankeringsadmin
DB_SSL_REJECT_UNAUTHORIZED=false
```

The migration seeds starter zones and major Canadian FSA mappings. Admin users can edit rates without code changes or redeploys.

## Ops Portal

Open `/ops/shipping-rates` on the ops host.

Sections:

- `Shipping Zones`: create/edit zone names, flat rates, free thresholds, active state, and sort order.
- `FSA Regions`: search/filter FSA mappings, create/edit/deactivate mappings, and import CSV files.
- `FSA Overrides`: override an individual FSA to a different active zone.
- `Rate Tester`: test a postal code and optional order subtotal before using it in checkout.
- `Fallback Settings`: manage `FALLBACK_CANADA` and see fallback usage count.

CSV columns:

```text
fsa,province,city,urban_rural,region_band,shipping_zone_code,active,notes
```

Invalid CSV rows are skipped and returned with row-numbered errors; valid rows are upserted by FSA.

## Rate Resolution

The resolver follows:

```text
postal code -> normalize -> FSA -> active override -> active FSA mapping -> active zone -> FALLBACK_CANADA
```

If the order subtotal is greater than or equal to the selected zone's `free_shipping_threshold`, the final rate is `0`.

Fallback is used for unknown or invalid FSAs. Checkout should only fail if `FALLBACK_CANADA` is missing or inactive, or if the database is unavailable.

## Checkout Integration

The storefront checkout calls:

```text
POST /api/shipping/rate
```

Vendure's final postal shipping calculator also reads the same admin DB tables first, then falls back to the older Vendure postal-zone table only as an emergency fallback. This keeps the checkout display and charged shipping aligned.

