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

## Shipping

The custom region-based shipping plugin is registered. In Admin, create a **Shipping Method** and select:

- **Eligibility checker:** Region-based shipping
- **Calculator:** Region-based rate (Toronto / Ontario / Canada / USA / Remote)

Assign the method to your shipping zone(s). Rules: Toronto (M prefix) $10, Ontario $15, Canada $20, remote (NT/YT/NU) $35, USA $30 (prices in CAD cents).

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

### PayPal

Vendure does not ship an official PayPal plugin in `@vendure/payments-plugin` for v2. Options:

- **Custom PaymentMethodHandler:** Implement a handler that calls the PayPal API (Orders or Checkout) and implements Vendure’s `PaymentMethodHandler` interface (createPayment, settlePayment, etc.). See [Vendure payment guide](https://docs.vendure.io/guides/core-concepts/payment).
- **Community:** Search for `vendure paypal` (e.g. `hopatibo/vendure-paypal-checkout`) and integrate if the project is compatible with your Vendure version.
- **Braintree:** If you use Braintree (owned by PayPal), `@vendure/payments-plugin` includes a Braintree plugin you can use instead.
