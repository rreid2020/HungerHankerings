# Resend shows no emails / customers get no verification mail

## Resend dashboard is empty

Nothing appears under **Sending** until Vendure’s worker **successfully connects to Resend over SMTP** and submits a message. If the dashboard stays empty:

1. **SMTP on the worker** — On the droplet, `docker compose ... logs vendure-worker | head -60` must show:
   `[vendure] EmailPlugin: SMTP enabled (smtp.resend.com:465, user=resend)`  
   If you see **SMTP not configured** / **dropped**, add `SMTP_*` to `.env` and run `up -d --force-recreate` for **both** `vendure` and `vendure-worker`.

2. **From address** — Set `SMTP_FROM` to an address Resend allows, e.g. after verifying **hungerhankerings.com**:
   `SMTP_FROM=Hunger Hankerings <noreply@hungerhankerings.com>`  
   The default `onboarding@resend.dev` only sends to **your own** Resend signup email, not arbitrary customers.

3. **After changing `.env`** — Rebuild/restart Vendure + worker so new env is loaded.

## Popup on register

The site should show an **on-page green success box**, not a browser alert. If you still see **“143.110… says”**, the storefront container is running an **old build**. Redeploy or rebuild the **storefront** image.
