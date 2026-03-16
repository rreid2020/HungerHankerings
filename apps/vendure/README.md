# Vendure backend

Vendure server and worker for Hunger Hankerings.

## Setup

1. Set environment variables (see root `.env.example` and `deploy/env.production.example`).
2. Ensure PostgreSQL and Redis are running (Docker Compose or managed).
3. Run migrations (when using production with `synchronize: false`):
   From **repo root**: `pnpm run migrate:vendure`. Or from this dir: `pnpm run build` then `pnpm run migrate`. Put prod DB vars in `apps/vendure/.env`.
   (Optional) create a `.env` (or copy from droplet) with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` pointing at the managed DB, then run the same command. Run this before deploying so the droplet’s stack starts against an already-migrated DB.
4. Start the server: `node dist/index.js` (or `pnpm start`).
5. Start the worker: `node dist/worker.js` (or `pnpm start:worker`).

## Admin UI

Open `/admin` (e.g. http://localhost:3000/admin). Log in with `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`.

## Canadian tax (province-based)

Province-specific tax is configured via a custom **TaxZoneStrategy** and zones/tax rates. To seed zones and rates so you don’t have to create them in Admin:

1. Ensure **Canada** is enabled in Admin → **Settings** → **Countries** (the seed adds Canada to each zone).
2. From this directory: `pnpm run build` then `pnpm run seed:canadian-tax`.  
   On the droplet (same DB env):  
   `node dist/seed-canadian-tax-zones.js`

This creates zones **CA-AB**, **CA-BC**, … **CA-YT** and **Canada** (fallback), each with Canada as member, and a **Standard** tax rate per zone (e.g. CA-ON 13%, CA-QC 14.975%, CA-AB 5%). It also sets the channel’s default tax zone to **Canada**. Safe to run multiple times (skips existing zones/rates).

## Shipping

Postal-code–based shipping uses the **PostalCodeZone** table with **3-character FSA lookup** (Canada) or country default (US). Seed the table, then create a Shipping Method in Admin.

1. **Create the table** (if it’s missing, e.g. DB was created before PostalZonePlugin was added):  
   `pnpm run build && pnpm run create-postal-zone-table`  
   On droplet (with same .env):  
   `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml run --rm vendure node dist/create-postal-code-zone-table.js`  
   Or run the SQL in `apps/vendure/scripts/create-postal-code-zone-table.sql` against your DB.

2. **Seed postal zones** (run once after the table exists):  
   `pnpm run build && pnpm run seed:postal-zones`  
   On droplet: `docker compose ... run --rm vendure node dist/seed-postal-code-zones.js`  
   Inserts 18 Canadian first-letter regions (A, B, C, E, G, H, J, K, L, M, N, P, R, S, T, V, X, Y) plus CA default and US default, each with a placeholder rate ($12 CA, $18 US).

   **Shipping rates UI:** Open **/shipping-rates** on the same host as the API (e.g. http://localhost:3000/shipping-rates) while logged in to Admin. You can view and edit each zone’s rate (cents) and save; the page uses the Admin API. Alternatively edit the `postal_code_zone` table directly.

3. **Admin** → **Settings** → **Shipping methods** → Create; choose:
   - **Eligibility checker:** Postal code shipping
   - **Calculator:** Postal code zone rate (Canada 3-char FSA, US default)

4. Assign the method to your channel’s shipping zone(s). The storefront syncs the shipping address (with postal code) to Vendure and displays the shipping charge from the API.

**Remote or costly FSAs:** Lookup uses the **first 3 characters** of the postal code (Canadian FSA, e.g. K0K, M5V). Add rows for any FSA that needs a different rate (e.g. remote). Example: add `CA` + `K0K` = “Eastern ON remote” with a higher rate; addresses in K0K will use it, all others fall back to CA default. Insert into `postal_code_zone` (countryCode, prefix, zoneName, rateCents) then edit at **/shipping-rates**.

## Payment

### Dummy (development)

A dummy payment handler is configured. In Admin → **Settings** → **Payment methods**, create a Payment Method and choose **"Dummy payment"**.

### Stripe (production)

1. **Install** (already in package.json): `@vendure/payments-plugin`, `stripe`.
2. **StripePlugin** is registered in `vendure-config.ts`. No env vars are required in code; keys are set per Payment Method in Admin.
3. **Stripe Dashboard**
   - Create a Stripe account and get **Secret key** (and **Publishable key** for the storefront).
   - **Developers** → **Webhooks** → **Add endpoint**:
     - URL: `https://your-domain.com/payments/stripe` (e.g. `https://143.110.221.220/payments/stripe` if using IP, or your real domain).
     - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`.
   - Copy the **Webhook signing secret**.
4. **Admin UI**
   - **Settings** → **Payment methods** → **Create new payment method**.
   - **Handler:** choose **"Stripe payments"**.
   - **API key:** your Stripe **Secret key** (e.g. `sk_test_...` or `sk_live_...`).
   - **Webhook secret:** the signing secret from the webhook endpoint.
5. **Storefront**
   - Use the `createStripePaymentIntent` mutation (from the plugin) to get a client secret, then use Stripe.js / Stripe Elements to confirm payment. See [Vendure Stripe docs](https://docs.vendure.io/current/core/reference/core-plugins/payments-plugin/stripe-plugin). For React: `@stripe/react-stripe-js` and `@stripe/stripe-js`.
   - Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (or equivalent) in the storefront for the publishable key.

6. **"column order_order_customer.customFieldsStripecustomerid does not exist"**  
   With `storeCustomersInStripe: true`, the plugin adds a custom field on the Customer entity. If the DB was created with `synchronize: false`, that column may be missing. Fix options:
   - **Add the column (recommended):** From repo root: `pnpm run build --filter vendure` (or `cd apps/vendure && pnpm run build`), then run the one-time script with the same DB env as production:  
     `cd apps/vendure && node dist/add-stripe-customer-column.js`  
     (On the droplet: run the vendure container with the same env and run that script, or run it from the host with DB_* in .env.)
   - **Or** set `storeCustomersInStripe: false` in `StripePlugin.init({ ... })` so the plugin does not store Stripe customer IDs (no DB change; slightly less strict about reusing payment intents).

### PayPal

Vendure does not ship an official PayPal plugin in `@vendure/payments-plugin` for v2. Options:

- **Custom PaymentMethodHandler:** Implement a handler that calls the PayPal API (Orders or Checkout) and implements Vendure’s `PaymentMethodHandler` interface (createPayment, settlePayment, etc.). See [Vendure payment guide](https://docs.vendure.io/guides/core-concepts/payment).
- **Community:** Search for `vendure paypal` (e.g. `hopatibo/vendure-paypal-checkout`) and integrate if the project is compatible with your Vendure version.
- **Braintree:** If you use Braintree (owned by PayPal), `@vendure/payments-plugin` includes a Braintree plugin you can use instead.
