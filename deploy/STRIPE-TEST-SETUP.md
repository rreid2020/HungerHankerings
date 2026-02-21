# Stripe test sandbox in Saleor

Use Stripe **test** keys so no real charges are made. Configure Saleor first, then (if needed) wire the storefront to use the Stripe gateway.

---

## 1. Get Stripe test keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com).
2. Turn **Test mode** on (toggle in the top right).
3. Go to **Developers → API keys**.
4. Copy:
   - **Publishable key** (starts with `pk_test_`) — used on the storefront.
   - **Secret key** (starts with `sk_test_`) — used only by Saleor.

**Optional (recommended by Stripe from 2025):** Create a **Restricted** key instead of using the secret key:

- **Developers → API keys → Create restricted key**.
- Name it e.g. "Saleor".
- Enable: **Charges: Write**, **All Webhook: Write**, **Customers: Write**, **Payment Intents: Write**.
- Create and copy the key (starts with `sk_test_` or `rk_test_`).

---

## 2. Configure Stripe in Saleor Dashboard

1. Open your Saleor Dashboard (e.g. `http://142.93.146.26:9000`).
2. Go to **Configuration → Plugins**.
3. Find **Stripe** and click to open.
4. Turn the plugin **Active** (on).
5. Fill in:

   | Field | Value |
   |-------|--------|
   | **Public API key** | Your Stripe **publishable** test key (`pk_test_...`) |
   | **Restricted API key** | Your Stripe **secret** test key (`sk_test_...`) or your **restricted** key |
   | **Supported currencies** | e.g. `USD` or `CAD` (ISO 4217, comma-separated if multiple) |
   | **Automatic payment capture** | On = capture as soon as payment succeeds; Off = authorize only, capture later |

6. Save.

---

## 3. Backend URL for Stripe webhooks (fixes “spinning” save)

The Stripe plugin **must** know your Saleor API’s **public** URL to register webhooks. If it doesn’t, the plugin can hang on save or leave the webhook endpoint empty.

**Set this on the server where Saleor API runs (e.g. Droplet `.env`):**

```bash
# Public URL of the Saleor API (no trailing slash). Replace with your Droplet IP or domain.
PUBLIC_URL=http://142.93.146.26:8000
```

- If your API is behind **HTTPS**, use `https://your-domain.com` and set `ENABLE_SSL=true` (required for Stripe **live** keys; test keys often work with `http`).
- **Do not** use `localhost` or the internal Docker hostname (e.g. `saleor-api`); Stripe cannot reach those.

Your `docker-compose.prod.yml` already passes `PUBLIC_URL` and `ENABLE_SSL` from `.env` into the Saleor API. After adding or changing `PUBLIC_URL`, restart the API:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d --force-recreate saleor-api
```

Then try saving the Stripe plugin again (leave **Webhook endpoint** empty).

In Saleor Dashboard:

1. **Configuration → Site settings** (or **Settings → Site**).
2. Set **Backend domain** / **Storefront address** / **API URL** (wording depends on version) to your **Saleor API** base URL, e.g. `http://142.93.146.26:8000`.
3. Save.

If this is wrong or empty, Stripe webhook registration may fail or use the wrong URL.

---

## 4. Channel: require payment

For Stripe to be used, the channel must **not** allow unpaid orders:

1. **Configuration → Channels** → open your channel (e.g. default).
2. **Order settings** (or **Checkout**):
   - **Allow unpaid orders** → **Off** (payment required).
3. Save.

---

## 5. Verify in Stripe

1. In Stripe Dashboard go to **Developers → Webhooks**.
2. You should see an endpoint pointing to your Saleor API (e.g. `https://your-api/graphql/` or a plugin webhook path). Saleor creates this when the Stripe plugin is activated and the backend URL is set.

---

## 6. Storefront: using Stripe at checkout

Saleor expects this flow:

1. **Create payment:** Call `checkoutPaymentCreate` with `gateway: "mirumee.payments.stripe"` and `amount` = checkout total.
2. **Complete checkout:** Call `checkoutComplete`. Saleor may return `confirmationNeeded: true` and `confirmationData` with Stripe’s **client_secret**.
3. **Confirm with Stripe:** On the frontend, use [Stripe.js](https://stripe.com/docs/js) (e.g. `stripe.confirmCardPayment(client_secret, { payment_method: { card: ... } })`) so the customer enters card details and Stripe processes the payment.
4. **Complete again:** After Stripe confirms, call `checkoutComplete` again; Saleor then creates the order.

Your storefront currently may be using “allow unpaid orders” and a single `checkoutComplete` call. To test real Stripe payments you’ll need to:

- Add **checkoutPaymentCreate** before **checkoutComplete**.
- If **checkoutComplete** returns `confirmationNeeded` and `confirmationData`, render Stripe Elements (or Card Element), collect card details, confirm with the `client_secret`, then call **checkoutComplete** again.

**Publishable key on the storefront:** If you use Stripe.js on the client, set your Stripe **publishable** test key in the frontend (e.g. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`). Never put the secret key in the storefront.

---

## Quick checklist

- [ ] Stripe in **Test mode**, test keys copied.
- [ ] Saleor **Configuration → Plugins → Stripe**: Active, Public + Restricted (or Secret) keys, currency, capture preference.
- [ ] **Site settings**: Backend/API URL set to your public Saleor API URL.
- [ ] **Channel**: Allow unpaid orders **Off**.
- [ ] **Stripe Dashboard → Webhooks**: Endpoint for your Saleor API exists.
- [ ] Storefront: payment flow uses Stripe gateway and (if needed) Stripe.js + second `checkoutComplete`.

---

## Troubleshooting

- **“No payment gateway” / Stripe not in list:** Ensure the Stripe plugin is **Active** and the channel has payment required (allow unpaid orders off).
- **Webhook errors in Stripe:** Check that Backend domain in Saleor matches the URL Stripe uses and that the Saleor API is reachable from the internet.
- **Payment fails at checkout:** Use Stripe **Developers → Logs** and **Webhooks** to see errors; check that the storefront sends the correct `amount` and that you confirm the payment with Stripe before the second `checkoutComplete`.
