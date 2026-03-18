# Testing email verification in development

In dev, Vendure’s EmailPlugin runs in **dev mode**: it does **not** send real emails. Instead it writes them to a local **mailbox** so you can open the verification (and password-reset) links and test the full flow without configuring SMTP.

## How to test the customer dashboard

1. **Run the app** (Vendure + storefront) as usual.  
   In your **Vendure** `.env`, set `APP_URL` to your storefront URL (e.g. `http://localhost:3001` if the storefront runs on 3001) so the verification link in the mailbox points to your storefront’s `/account/confirm` page.

2. **Create an account** on the storefront (Register page).

3. **Open Vendure’s dev mailbox**  
   Emails are shown at Vendure’s `/mailbox` route. Use the same base URL as your Shop API, with `/shop-api` replaced by `/mailbox`:
   - If Shop API is `http://localhost:3000/shop-api` → open **http://localhost:3000/mailbox**
   - If you use a different port or host, replace `/shop-api` with `/mailbox` in that URL.

4. **Find the verification email** in the mailbox and **click the confirmation link** (or copy the URL and open it in the same browser).  
   The link will take you to the storefront’s `/account/confirm` page and complete verification.

5. **Log in** on the storefront with the same email and password. You should now be able to open the **customer account/dashboard** and test orders, profile, addresses, etc.

## Password reset in dev

Same idea: request a password reset on the storefront, then open the Vendure mailbox, find the reset email, and use the link to set a new password.

## Production (droplet / IP like `143.110.221.220`)

**The dev mailbox does not work there.** Your droplet runs Vendure with `NODE_ENV=production`, so EmailPlugin **sends mail via SMTP** (or does nothing if SMTP isn’t set). The `/mailbox` UI is **only enabled in development** on the Vendure process.

So:

- **`http://YOUR_DROPLET_IP/mailbox`** will not show captured emails on a normal production deploy (even though nginx can proxy `/mailbox` to Vendure, Vendure is not running in email dev mode).
- To test verification on the droplet: add **Resend SMTP** (`SMTP_*`) to the server `.env`, restart Vendure, register again, and check the **real inbox** (and the Resend dashboard if needed).

## Local development vs droplet

| Where you run | Mailbox works? | How to verify account |
|---------------|----------------|------------------------|
| **Local** (Vendure not in production) | Yes → `http://localhost:3000/mailbox` (Vendure’s port) | Open mailbox, click link in email |
| **Droplet / production** | No | Configure SMTP; use real email |

If your storefront’s `NEXT_PUBLIC_VENDURE_SHOP_API_URL` points at the **droplet** while you develop locally, the “Vendure mailbox” link will still open `https://droplet/mailbox` — that **won’t** give you dev emails. For mailbox testing, run **Vendure locally** in dev and point the storefront at `http://localhost:3000/shop-api` (or use the mailbox at `http://localhost:3000/mailbox` after registering against that Vendure).

## Production email

In production, set SMTP (e.g. Resend) in the server `.env`. Verification and password-reset emails go to the user’s inbox; no mailbox is used.
