# `POST /api/checkout/complete` returns 400

The handler always responds with JSON: `{ "error": "…" }`. **Open DevTools → Network → the failed request → Response** and read `error` — that string is the real cause.

Below matches `storefront/app/api/checkout/complete/route.ts`.

## Causes (by message / situation)

| Symptom / `error` text | Likely cause | Fix |
|------------------------|--------------|-----|
| **Email is required** | Missing billing email in payload | Ensure checkout form sends `billing.email` (CartContext reads it for `email`). |
| **Your checkout session was lost (no cart cookie)** | Request had no `Cookie` header | Enable cookies; same browser tab; not blocking third‑party (usually N/A here). If you use a REST client, copy cookies from the browser. |
| **Could not attach account to order** | “Create account” + `customerLoginWithCookies` failed | Check Vendure logs; email may already exist with wrong password; SMTP/verification issues. |
| **No shipping methods are available for this address** | `eligibleShippingMethods` is empty | Seed/configure **shipping methods** and **zones** in Vendure for that country/postal code. Canadian postal codes: ensure your custom postal-zone logic matches the format you send (e.g. normalized spacing). |
| **Could not read order after preparing payment** | Stripe path: no order code after PI | Retry; check Vendure + Stripe plugin; session/order consistency. |
| **Stripe checkout failed** / **Failed to create Stripe payment intent** | Stripe secret key, plugin, or payment method misconfigured in Vendure | Vendure Admin → Stripe payment method; `STRIPE_*` / plugin env on Vendure container; webhooks optional for PI creation but needed for settlement. |
| **Checkout cannot continue: … no allowed order transitions** | Logged-in **Customer** role includes **Owner** (Vendure quirk) | Log out and use guest checkout, or remove **Owner** from Customer role (keep checkout permissions). See comment in `vendure-config.ts`. |
| **Cannot set a Customer for the Order when already logged in** | Shop session already has a Customer, but checkout still called `setCustomerForOrder` — e.g. `vendure_token` missing on the request while the Vendure session cookie still reflects login (same pattern as `/api/auth/me` falling back to cookies) | **Fixed in code:** skip guest email step when `activeOrder.customer` exists; try/catch for this message. Redeploy storefront. |
| **No active order** / **Set customer for order** / **Set shipping address** / GraphQL errors | Shop session on the server does not match the cart you think you have | See **Session / URL alignment** below. |
| **Order was not created. Payment may be required.** | Dummy checkout path without valid completion | Usually payment plugin / `addPaymentToOrder` returned no order token. |
| **Failed to add item** (generic) | Rare `addItemToOrder` failure | Gift add-on no longer uses a variant; remove **`VENDURE_GIFT_BOX_VARIANT_ID`** from env if present. |
| Any other Vendure message | GraphQL `ErrorResult` or network | Read full `error`; check `docker compose … logs vendure --tail=100` at the same timestamp. |

## Session / URL alignment (very common on droplets)

Checkout complete **forwards the browser’s `Cookie` header** to Vendure. The active cart must be that **same** Shop API session.

1. **`NEXT_PUBLIC_VENDURE_SHOP_API_URL` (build-time)**  
   The browser must call Shop API at the **same site** users use to shop (e.g. `http://YOUR_IP/shop-api` or `https://yourdomain.com/shop-api` behind nginx).  
   Wrong: building the image with `http://localhost:3000/shop-api` while users hit the droplet IP — the session cookie is on the wrong host.

2. **`APP_URL` (Vendure CORS)**  
   In production, CORS is restricted to `APP_URL`. If shoppers use `http://143.110.221.220` but `APP_URL` is only `https://www.example.com`, browser requests to `/shop-api` can fail (cart/checkout break).  
   **Fix:** Set `APP_URL` to the origin customers actually use, or add that origin to CORS (customize `vendure-config.ts` if you need multiple origins).

3. **HTTPS vs HTTP and cookies**  
   `VENDURE_COOKIE_SECURE=true` + site only on **HTTP** → browsers won’t store/send the session cookie.  
   **Fix:** Use HTTPS in production, or keep `VENDURE_COOKIE_SECURE` off until TLS is enabled (see `vendure-config.ts`).

4. **Cookie path**  
   This project sets Vendure cookie `path: "/"`, so the session is sent to `/api/checkout/complete` as long as it’s the same host.

## Quick checks on the server

```bash
# After reproducing a 400:
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs storefront --tail=80
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs vendure --tail=80
```

Confirm env inside containers: `NEXT_PUBLIC_VENDURE_SHOP_API_URL` baked into storefront, `VENDURE_SHOP_API_URL` for server-side proxy, `APP_URL`, Stripe keys on **Vendure**. Do **not** set `VENDURE_GIFT_BOX_VARIANT_ID` (removed).

## Dummy vs Stripe

- If **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** is set on the **storefront**, the route uses **Stripe Payment Intents**; failures surface as Stripe-related `error` messages.
- If it is **not** set, checkout completes with the **dummy** payment method code from env (`VENDURE_DUMMY_PAYMENT_METHOD_CODE` or default).
