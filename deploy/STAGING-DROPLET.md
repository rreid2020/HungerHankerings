# Staging on DigitalOcean (SMTP and smoke tests)

**New to email setup?** Use the full numbered guide: **[EMAIL-STAGING-WALKTHROUGH.md](./EMAIL-STAGING-WALKTHROUGH.md)** (Resend, `.env`, Docker, tests—includes “don’t break live site” paths).

Use this page when the droplet is **not** your final production site but runs like production (`NODE_ENV=production` in Docker). Vendure **does not** use the dev `/mailbox` UI on the server—mail goes out only if **`SMTP_*`** is set.

## 1. Resend (or another SMTP provider)

1. Create an account at [Resend](https://resend.com).
2. **Domains** → add your domain or a subdomain (e.g. `staging.yourdomain.com`), add the DNS records (SPF/DKIM) they show, wait until verified.
3. **API Keys** → create a key (starts with `re_`).

For a very quick smoke test only, you can use `SMTP_FROM` with Resend’s test sender and deliver only to your own inbox—see Resend docs. For real staging QA with arbitrary customer emails, **verify a domain** first.

## 2. `.env` on the droplet

Path is usually `/root/HungerHankerings/.env`. Start from [`env.production.example`](./env.production.example) and set **staging** values:

| Variable | Staging notes |
|----------|----------------|
| `APP_URL` | `https://your-staging-host` (same origin browsers use) |
| `NEXT_PUBLIC_VENDURE_SHOP_API_URL` | `https://your-staging-host/shop-api` |
| `NEXT_PUBLIC_SITE_URL` | Same as `APP_URL` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **`pk_test_...`** (not live) |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` |
| `SMTP_PASS` | Your `re_...` API key |
| `SMTP_SECURE` | `true` |
| `SMTP_FROM` | Smoke test (no DNS): `Hunger Hankerings <onboarding@resend.dev>`. Later: verified domain address. |
| `ORDERS_INBOX_EMAIL` | Optional; internal “new order” notifications go here (use your real address for staging) |

Keep **`VENDURE_REQUIRE_EMAIL_VERIFICATION`** enabled (default) unless you are explicitly testing without email.

Use **different** `COOKIE_SECRET` and DB credentials than true production.

## 3. Reload Vendure and the worker

Both services must see the new env (see [`docker-compose.prod.yml`](../docker-compose.prod.yml)):

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
set -a && . ./.env && set +a
comp="docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml"
$comp up -d --force-recreate vendure vendure-worker
```

## 4. Confirm SMTP in logs

```bash
$comp logs vendure 2>&1 | head -80
$comp logs vendure-worker 2>&1 | head -80
```

You want a line like:

`[vendure] EmailPlugin: SMTP enabled (smtp.resend.com:465, user=resend)`

If you see **SMTP_HOST not set** or **outgoing mail disabled**, the containers did not load `SMTP_HOST` (check `.env`, `env_file`, and that you recreated **both** `vendure` and `vendure-worker`).

## 5. Functional tests

1. **Registration** — sign up with a real address you can open; complete verification if required.
2. **Password reset** — request reset and click the link.
3. **Checkout** — complete a test order with a Stripe test card; confirm order/receipt email (and Resend **Logs** if needed).
4. **Internal order mail** — if `ORDERS_INBOX_EMAIL` is your inbox, confirm you receive the ops notification.

## 6. Resend dashboard

If mail does not arrive, check Resend **Logs** for bounces or API errors; wrong `SMTP_FROM` or unverified domain is the most common issue.

## 7. Resend shows **no** activity at all

That means nothing successfully talked to Resend’s SMTP (or traffic never left your server). Check in order:

1. **Both variables for SMTP auth** — This project only sends credentials if **`SMTP_USER` and `SMTP_PASS` are both non-empty**. For Resend you need `SMTP_USER=resend` and `SMTP_PASS=re_...`. If `SMTP_USER` is missing, Vendure may log “SMTP enabled” with “no auth” and **no email will reach Resend** (dashboard stays empty).

2. **Worker is running** — Order and many other emails run through the **job queue**. Confirm `vendure-worker` is **Up** (`docker compose ... ps`). If only `vendure` is healthy, jobs pile up and nothing hits Resend.

3. **Env inside containers** — After editing `.env`, you must **recreate** `vendure` **and** `vendure-worker`. Verify the host is visible (no secrets in screenshots):
   `docker compose ... exec vendure printenv SMTP_HOST SMTP_USER`
   `docker compose ... exec vendure-worker printenv SMTP_HOST SMTP_USER`  
   `SMTP_USER` should be `resend`, not empty.

4. **Startup logs** — After deploy, grep for the new warning:  
   `mail will not reach Resend` (means host looks like Resend but auth is incomplete).

5. **Outbound firewall** — Rare on DO, but SMTP uses **465** or **587** outbound to `smtp.resend.com`.

## Related docs

- **[`DROPLET-SECURITY.md`](./DROPLET-SECURITY.md)** — **read this on every new Droplet** (SSH, firewall, fail2ban, Nginx rate limits) especially after a compromise or abuse report  
- [`MIGRATE-TO-NEW-DROPLET-NO-VPC.md`](./MIGRATE-TO-NEW-DROPLET-NO-VPC.md) — new server, clone, `.env`, DB trusted sources  
- [`DEPLOY-VIA-GITHUB.md`](./DEPLOY-VIA-GITHUB.md) — compose command with Nginx; GitHub Actions `DROPLET_IP`  
- [`env.production.example`](./env.production.example) — full variable list  
- [`../storefront/docs/RESEND-SMTP.md`](../storefront/docs/RESEND-SMTP.md) — Resend + worker troubleshooting  
- [`../storefront/docs/DEV-EMAIL-VERIFICATION.md`](../storefront/docs/DEV-EMAIL-VERIFICATION.md) — why `/mailbox` is not used on the droplet  

After a **new public IP**, update `APP_URL`, `NEXT_PUBLIC_*` URLs, DNS, and any secrets you rotated.  
