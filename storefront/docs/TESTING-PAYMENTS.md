# Testing checkout & payments

The storefront checkout uses **Vendure** `addPaymentToOrder` once per checkout:

- **Stripe** — when the browser sends a Stripe PaymentMethod id (`pm_…`) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. The API uses the payment method **code** from Admin (see below).
- **Dummy** — when no Stripe publishable key is configured or the customer does not complete Elements, checkout uses the **dummy** payment method code (for local / QA).

PayPal, Google Pay, Apple Pay, and Shop Pay in the checkout UI are **not** wired to separate gateways yet; use **Credit card** with Stripe test cards, or **dummy** for a quick flow.

---

## 1. Dummy payment (fastest smoke test)

1. **Vendure Admin** → **Settings** → **Payment methods** → create a method with handler **Dummy payment**.
2. Note the **Code** (e.g. `dummy-payment-method`). It must match the server env **`VENDURE_DUMMY_PAYMENT_METHOD_CODE`** if you override it (default in code is `dummy-payment-method`).
3. Assign the method to your **channel** if required by your Vendure version.
4. **Storefront:** leave **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** empty (or unset) for that environment, **or** use the site without entering card data if your UI allows submitting without Elements — with no key, the app does not create a `pm_` and checkout uses dummy.
5. Complete checkout with a valid cart, addresses, and shipping. The order should complete without Stripe.

---

## 2. Stripe test mode

### Droplet `.env` (nano / project root)

Put the full publishable key on one line (not truncated):

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Abc...rest_of_key
```

`NEXT_PUBLIC_*` is baked in when the **storefront image is built**. After editing `.env` on the server, rebuild the storefront (e.g. your deploy workflow or `docker compose ... build storefront` then `up -d`). Restarting the container alone is **not** enough if you only changed the key without rebuilding.

1. **Stripe Dashboard** (test mode): create **Publishable** and **Secret** keys (`pk_test_…`, `sk_test_…`).
2. **Webhook** (test): URL `https://<your-host>/payments/stripe` (same host as Vendure in production/nginx). Events: e.g. `payment_intent.succeeded`, `payment_intent.payment_failed`. Copy the **signing secret**.
3. **Vendure Admin** → **Payment methods** → **Stripe payments**:
   - **Code** must match **`VENDURE_STRIPE_METHOD_CODE`** on the server (default `stripe`).
   - Paste **Secret key** and **Webhook secret**.
4. **Environment (storefront / API route):**
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` (baked at **build** for Docker — rebuild storefront after changing).
   - `VENDURE_STRIPE_METHOD_CODE=stripe` (or whatever code you set in Admin).
5. **Rebuild & redeploy** the storefront container after changing `NEXT_PUBLIC_*`.
6. **Test card:** `4242 4242 4242 4242`, any future expiry, any CVC, any postal code (see [Stripe test cards](https://docs.stripe.com/testing)).
7. If **3DS** is required, the checkout flow should return `clientSecret` and the page runs `confirmCardPayment` (see `checkout/page.tsx`).

---

## 3. Production checklist

- Use **`pk_live_…`** / **`sk_live_…`** only in production.
- Webhook URL must use your **public HTTPS** domain.
- **`APP_URL`** / **`NEXT_PUBLIC_SITE_URL`** should match the URL customers use (redirects and emails).

---

## 4. Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| CSP blocks `applepay.cdn-apple.com` | Nginx **`Content-Security-Policy`** must allow `script-src` for `https://applepay.cdn-apple.com` (and Stripe-related `connect-src` / `frame-src`). See `nginx/nginx.conf`; redeploy/reload nginx after changes. |
| `POST /api/checkout/complete` **500** | Check **`docker compose ... logs storefront --tail=80`** at checkout time; often Vendure/Stripe error message in logs. Fix CSP first if the browser blocked Stripe scripts, then retry. |
| “No such payment method” / handler error | Payment method **code** in Admin matches `VENDURE_STRIPE_METHOD_CODE` or `VENDURE_DUMMY_PAYMENT_METHOD_CODE`. |
| Stripe Elements don’t load | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set and storefront **rebuilt**. |
| Webhook failures | Vendure logs; Stripe **Developers → Webhooks** → delivery attempts; URL must hit Vendure `/payments/stripe`. |
| Order not created after pay | Vendure + worker logs; DB migrations; Stripe plugin `storeCustomersInStripe` / custom field issues — see `apps/vendure/README.md`. |

For more backend detail, see **`apps/vendure/README.md`** (Payment section).
