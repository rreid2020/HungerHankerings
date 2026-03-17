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

## Production

In production, set SMTP (e.g. Resend) in the server `.env` and use the real domain. Verification and password-reset emails will be sent to the user’s inbox; no mailbox is used.
