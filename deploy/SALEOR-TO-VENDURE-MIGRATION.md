# Saleor to Vendure Migration Summary

This document summarizes the migration from Saleor to Vendure for the Hunger Hankerings storefront and backend.

## What Was Removed

- **Docker:** Services `saleor-api`, `saleor-worker`, `saleor-dashboard` from `docker-compose.yml` and `docker-compose.prod.yml`. Volumes `saleor_postgres`, `saleor_media`. File `docker-compose.jwt.yml` (deleted).
- **Nginx:** Upstreams and locations for Saleor (`/graphql/`, `/dashboard/`). Replaced with Vendure routes.
- **Environment:** Saleor-specific variables (`DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `SALEOR_CHANNEL`, `NEXT_PUBLIC_SALEOR_API_URL`, `RSA_PRIVATE_KEY`, JWT, etc.) from examples and docs.
- **Storefront:** `storefront/lib/saleor.ts` is no longer used; all imports now use `storefront/lib/vendure.ts`. Saleor env vars removed from `storefront/Dockerfile` and `.env.example`.
- **Deploy docs:** Saleor migration steps, JWT generation, and Saleor-only instructions in `deploy/DROPLET-DATABASE-AND-MIGRATIONS.md` and related files were rewritten for Vendure.
- **GitHub Actions:** `docker-compose.jwt.yml` removed from the deploy workflow.

## What Was Added

- **Vendure backend (`apps/vendure`):**
  - Server (`src/index.ts`), worker (`src/worker.ts`), config (`src/vendure-config.ts`).
  - Migrate script (`src/migrate.ts`) for running TypeORM migrations.
  - Custom **region-based shipping plugin** (`src/plugins/shipping-plugin`): eligibility checker and calculator with rules (e.g. Toronto M-prefix $10, Ontario $15, Canada $20, remote $35, USA $30).
  - Plugins: DefaultJobQueuePlugin, AssetServerPlugin, AdminUiPlugin, EmailPlugin (dev mode), dummy payment handler.
  - PostgreSQL and optional Redis (DefaultJobQueuePlugin; BullMQ can be added later).
- **Docker:** Services `vendure` and `vendure-worker` in base and prod compose; `apps/vendure/Dockerfile`. Nginx updated to proxy `/shop-api`, `/admin-api`, `/admin`, `/assets/` to Vendure.
- **Environment:** New vars for Vendure and storefront: `DB_*`, `REDIS_*`, `COOKIE_SECRET`, `SUPERADMIN_*`, `APP_URL`, `NEXT_PUBLIC_VENDURE_SHOP_API_URL`, `VENDURE_SHOP_API_URL`. Examples in `.env.example`, `deploy/env.production.example`, `storefront/.env.example`.
- **Storefront API layer (`storefront/lib/vendure.ts`):** Single client for the Vendure Shop API with cookie/session support. Exposes the same logical operations as before (products, cart/order, checkout, customer, orders) with types kept compatible so UI code needed minimal changes.

## What Was Migrated

- **Products:** `listProducts` and `getProductByHandle` now call Vendure `products` and `product(slug)`; responses are mapped to the existing product type shape.
- **Cart:** Checkout ID in localStorage was replaced with **session-based** cart. The storefront uses `getActiveOrder()`, `addItemToOrder`, `adjustOrderLine`, `removeOrderLine`. CartContext loads the active order on mount and no longer persists a checkout ID.
- **Checkout flow:** Set email/customer, shipping and billing address, eligible shipping methods, set shipping method, add payment, complete. The `/api/checkout/complete` route forwards the request cookie to Vendure so the correct session/order is used.
- **Auth:** Saleor `tokenCreate` / `accountRegister` / `me` replaced with Vendure `authenticate` / `registerCustomerAccount` / `activeCustomer`. Session is cookie-based; auth cookies were renamed to `vendure_token` and `vendure_refresh_token` (with fallback to `saleor_*` for compatibility).
- **Account:** Address and profile updates use Vendure customer address mutations and `updateCustomer`.
- **Orders:** Customer order list and order-by-token (guest) use `activeCustomer.orders` and `orderByCode`. Vendure uses **order code** instead of token; the storefront treats code as the token for confirmation and account order pages.

## Limitations and TODOs

- **Order token vs code:** Vendure uses `orderByCode(code)`. The storefront uses the order code as the “token” for confirmation and account order detail URLs. If you need a separate guest token, it would require a custom field or extension.
- **Password reset / confirm:** `requestPasswordReset` is implemented; `confirmAccount` is a stub. Implement with Vendure’s verification flow or email plugin if required.
- **Stripe:** Placeholder env `VENDURE_STRIPE_METHOD_CODE` is used in the checkout route when Stripe is added. Configure a Stripe payment handler in Vendure and create the corresponding payment method in Admin.
- **Shipping methods:** Create at least one Shipping Method in Vendure Admin that uses the custom region eligibility checker and calculator, and assign it to the appropriate zone(s).
- **Superadmin:** Set `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` in `.env` before first run so the initial admin user can be created.
- **Redis job queue:** The app uses `DefaultJobQueuePlugin` (DB-backed). For production at scale, consider `BullMQJobQueuePlugin` and Redis.
- **Medusa backend:** The existing `backend/` (Medusa) was left unchanged; only Saleor was replaced with Vendure.

## Verification

- Run `docker compose --profile local up -d` (with Postgres profile) and `docker compose --profile local run --rm vendure node dist/migrate.js` if using migrations.
- Open Vendure Admin at `http://localhost:3000/admin`, create a channel and shipping method, add a product.
- Open the storefront, list products, add to cart, go through checkout (addresses, shipping method, place order with dummy payment).
- Confirm order on the confirmation page and in Admin. Test login/register and account orders/addresses.

## Files to Keep for Reference

- `storefront/lib/saleor.ts` (and any `.restored` / `.backup` copies) can be removed or archived once you are satisfied with the Vendure migration.
