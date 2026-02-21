# Shipping: Storefront rates vs Saleor

Your storefront calculates shipping by **province (Canada)** and **international** using flat rates in `lib/shippingTax.ts`. Those rates are **not** configured in Saleor.

Saleor still requires **at least one shipping method** to be set on the checkout before an order can be created. To satisfy that without duplicating your rates in Saleor:

## One-time Saleor setup

1. In **Saleor Dashboard** go to **Shipping** (or **Configuration → Shipping**).
2. Create **one shipping zone** that covers your delivery area (e.g. "Canada & International" with country "Canada" and "Rest of world" or the countries you ship to).
3. Add **one shipping method** to that zone:
   - Name: e.g. **"Standard"**
   - Price: **0** (or any placeholder; the real amount is calculated by the storefront)

The storefront will **always select this method** when completing checkout. Saleor uses it only so the checkout can complete; it does **not** drive the amount the customer pays.

## What the customer sees and pays

- **Shipping amount** is calculated in the storefront from `lib/shippingTax.ts` (by province / international).
- That amount is shown in the checkout **Order summary** and included in the **Grand total**.
- The same amount is sent to the API as `storefrontShippingAmount` and stored on the **order metadata** in Saleor (`storefront_shipping_amount`, `storefront_shipping_label`) so staff see the real shipping for each order.

## Summary

| Where            | Purpose |
|------------------|--------|
| **Storefront**  | Your real flat rates (by province / international). Customer sees and “pays” this. |
| **Saleor**       | One placeholder method (e.g. "Standard" $0) so checkout can complete. Order metadata holds the real shipping amount and label. |

No need to configure province-by-province or international rates in Saleor.
