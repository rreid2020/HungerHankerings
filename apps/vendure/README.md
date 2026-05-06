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

## Testing email with Mailpit (Docker)

The root `docker-compose.yml` includes [Mailpit](https://github.com/axllent/mailpit) (web UI **http://localhost:8025**, SMTP **mailpit:1025** inside the compose network).

1. In `.env` (or export before `docker compose up`):  
   `SMTP_HOST=mailpit` · `SMTP_PORT=1025` · leave `SMTP_USER` / `SMTP_PASS` empty · optional `ORDERS_INBOX_EMAIL=orders@hungerhankerings.com` (**BCC** on the customer confirmation by default; use `ORDERS_INBOX_SEPARATE_EMAIL=true` for a dedicated **[New order]** message).
2. Rebuild/restart **vendure** and **vendure-worker** so they pick up env (the worker sends queued emails).
3. Complete a checkout so the order reaches **PaymentSettled** — you should see the customer confirmation in Mailpit, with the inbox address on **Bcc** (or a separate **[New order]** thread if `ORDERS_INBOX_SEPARATE_EMAIL=true`).

If `SMTP_HOST` is **unset** and `NODE_ENV` is development, Vendure uses the built-in **`/mailbox`** file capture instead of SMTP (no Mailpit required).

## Admin UI

Open `/admin` (e.g. http://localhost:3000/admin). Log in with `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`.

## Canadian tax (province-based)

Province-specific tax is configured via a custom **TaxZoneStrategy** and zones/tax rates. To seed zones and rates so you don’t have to create them in Admin:

1. Ensure **Canada** is enabled in Admin → **Settings** → **Countries** (the seed adds Canada to each zone).
2. From this directory: `pnpm run build` then `pnpm run seed:canadian-tax`.  
   On the droplet (same DB env):  
   `node dist/seed-canadian-tax-zones.js`

This creates zones **CA-AB**, **CA-BC**, … **CA-YT** and **Canada** (fallback), each with Canada as member, and a **Standard** tax rate per zone (e.g. CA-ON 13%, CA-QC 14.975%, CA-AB 5%). It also sets the channel’s default tax zone to **Canada**. Safe to run multiple times (skips existing zones/rates).

**All tax categories:** The seed also adds the same provincial rate for **every other** tax category in the system (e.g. default Vendure **Reduced**). If products used a non-Standard category, you previously saw **“No configured tax rate”** on lines while shipping still showed tax. Re-run this seed after adding new categories so they get CA-AB … CA-ON rates too.

### Standard tax category on products and shipping

- **Product lines:** Tax comes from each **variant’s** tax category (Admin → product → variant). To force **every variant** to use **Standard** (matching your tax rates table):

  `pnpm run build && pnpm run seed:standard-tax-on-products`  
  (droplet: `node dist/seed-product-variant-standard-tax.js`)

- **Shipping:** Vendure does not store a separate “tax category” on shipping methods. The **postal shipping calculator** looks up the provincial rate using the **Standard** category (fallback: default category), i.e. the same **Settings → Tax rates** rows you use for products. After variants use Standard and zones/rates are seeded, product and shipping lines both align to those **Standard** rates for the active province zone (e.g. CA-ON).

## Gift wrap + card (checkout add-on — recommended)

Snack boxes use **one variant dimension in the catalog (e.g. size only)**. Gift wrap + card is a **per-box add-on at checkout** ($3.99), not a second dropdown on the product page.

### Storefront behavior

- **Product grid / PDP:** Option groups whose names match **gift / wrap / card** (case-insensitive) are **hidden**. Shoppers only pick **size** (and any other non-gift groups).
- If you still have **old variants** in Vendure (size × gift), the storefront picks the **cheapest** matching variant for the selected size (usually base price without gift). **Prefer cleaning up Admin** (below) so each size is a single variant.
- **Checkout:** Per-unit checkboxes + message; fee is shown in the order summary ($3.99/box + tax at shipping province, same formula as the server).

### Vendure / Stripe (no gift product variant)

1. **Sellable products:** Only **size** (or similar) in the option matrix — **remove** the gift option group and **regenerate variants** so you have one row per size at the **base** price.
2. **Gift fee:** The storefront sets Order custom field **`checkoutGiftSurchargeCents`** before payment. **Stripe** charges `order.totalWithTax` **plus** that amount (see `StripePlugin` `paymentIntentCreateParams` in `vendure-config.ts`). You do **not** need a gift `ProductVariant` or **`VENDURE_GIFT_BOX_VARIANT_ID`** (deprecated; remove from `.env` if still set).
3. **Deploy / database (required):** The new column must exist on the **`order`** table or **every** cart operation fails. If you use `synchronize: false` in production (default in this repo), run **once** after deploy:
   - **Script (recommended):** from `apps/vendure` after `pnpm run build`:  
     `pnpm run add-order-gift-surcharge-column`  
     Or with Docker:  
     `docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm vendure node dist/ensure-checkout-gift-surcharge-column.js`  
   **Note:** The Vendure **server and worker** now run this check **automatically on startup** before bootstrap, so a rebuild/restart is usually enough. The physical Postgres column name is **`customFieldsCheckoutgiftsurchargecents`** (TypeORM `DefaultNamingStrategy` + `titleCase` on `checkoutGiftSurchargeCents` — not PascalCase on every word).
   - **Or SQL:** `apps/vendure/scripts/add-order-checkout-gift-surcharge-column.sql` against Postgres.
   - **Dev:** with `synchronize: true`, restarting Vendure creates the column automatically.
4. **Admin totals:** The order’s line totals may not include the gift add-on; the **Stripe** charge is the source of truth for amount paid. The custom field shows the surcharge in minor units.

**Dummy payment (local):** The dummy handler settles against Vendure’s order total only; it does **not** add the gift surcharge. Use **Stripe test mode** to verify gift pricing end-to-end.

Do **not** bake gift into variant prices **and** use the checkout add-on — that **double-charges**.

**Stale checkout drafts:** Gift keys use `lineId-unitIndex`; orphaned keys are pruned when the cart changes.

## Guest checkout & customers

If a guest uses an **email that already belongs to a registered account**, Vendure’s default is to block `setCustomerForOrder` (**EmailAddressConflictError**), which leaves the order showing **Guest** with no linked customer. This project sets **`allowGuestCheckoutForRegisteredCustomers: true`** so the order attaches to the existing customer record.

**`LinkGuestCheckoutStrategy`** (see `src/link-guest-checkout-strategy.ts`) wraps the default strategy so:

- **Logged-in** shoppers still get the active order linked to their **Customer** (`DefaultGuestCheckoutStrategy` would return `AlreadyLoggedInError` and never call `addCustomerToOrder`, which blocked **ArrangingPayment** and left Admin showing “Guest”). The strategy uses `findOneByUserId(..., false)` so the Customer is found even if they are not assigned to the **current channel** (the default `filterOnChannel: true` lookup was empty → fallback to delegate → `AlreadyLoggedInError`).
- **True guests** still get a real **Customer** row via `createOrUpdate` (see [GuestCheckoutStrategy](https://docs.vendure.io/current/core/reference/typescript-api/orders/guest-checkout-strategy)).

Deploy the updated `vendure-config` and retry checkout.

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
   Inserts country defaults (CA, US) plus **all valid Canadian FSAs** (3,240 codes). Each FSA row has prefix, zone name, optional **city** and **region** (null until you add them), and **rateCents** = 0. You set your own rate (and city/region when available) per zone at **/shipping-rates**; 0 means “use country default” until you save a rate.

   **Shipping rates UI:** Open **/shipping-rates** on the same host as the API (e.g. http://localhost:3000/shipping-rates) while logged in to Admin. You can view and edit each zone’s rate (cents) and save; the page uses the Admin API. Alternatively edit the `postal_code_zone` table directly.

3. **Admin** → **Settings** → **Shipping methods** → Create; choose:
   - **Eligibility checker:** Postal code shipping
   - **Calculator:** Postal code zone rate (Canada 3-char FSA, US default)

4. Assign the method to your channel’s shipping zone(s). The storefront syncs the shipping address (with postal code) to Vendure and displays the shipping charge from the API.

**Rates and city/region:** You provide the rate (and optional city, region) per zone. Seed populates 3-char prefix and zone name only; rate starts at 0 (fallback to country default until you set one). Edit at **/shipping-rates** or in the `postal_code_zone` table. City and region are for display only (lookup uses prefix).

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
