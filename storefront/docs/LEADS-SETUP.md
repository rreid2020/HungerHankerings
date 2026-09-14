# Lead / Inquiry Forms Setup

The unified contact form on `/contact` (and site CTAs with `?reason=`) posts to `/api/leads` with **`type: "inquiry"`** and a **`reason`** field (see `lib/contact-inquiry.ts`). The handler:

1. **Saves** each submission to the **`leads`** table only (storefront shop traffic uses **Vendure’s HTTP API**, not direct Postgres). Resolution: **`LEADS_DATABASE_URL`** → if **`DB_*`** is complete, compose with **`LEADS_DATABASE_NAME`** or default **`hungerhankeringsadmin`** (**never** `DB_NAME`, so Vendure can stay on **`vendure`**) → else **`DATABASE_URL`**. On App Platform set **`LEADS_DATABASE_NAME=hungerhankeringsadmin`** (or **`LEADS_DATABASE_URL`**) alongside existing **`DB_NAME=vendure`** for Vendure.
2. **Sends** an email notification via **Resend** without blocking the HTTP response (defaults to **hello@hungerhankerings.com** when `LEAD_EMAIL_TO` is unset). You **must** set **`LEAD_EMAIL_FROM`** to an address on a domain **verified in Resend**; the SDK default `onboarding@resend.dev` does **not** reliably deliver to **hello@hungerhankerings.com**.

If Resend fails, check runtime logs for `notification email failed (async)` (the lead row still exists).

## PostgreSQL (Digital Ocean)

1. Create a database in your Digital Ocean control panel (e.g. `hungerhankeringsadmin`) if you have not already.
2. Apply Prisma migrations on that database (from repo `storefront/`). `DATABASE_URL` is read from `prisma.config.ts` (and `.env` via `dotenv`):

   ```bash
   export DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/hungerhankeringsadmin"
   npx prisma migrate deploy
   ```

3. Add to **App Platform / Docker** env for the **storefront** (same component as Next). Prefer one of:

   ```
   LEADS_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/hungerhankeringsadmin
   ```

   Or reuse **`DB_*`** from the cluster binding and override only the database name:

   ```
   LEADS_DATABASE_NAME=hungerhankeringsadmin
   ```

   Use the same host/port/user/password as your cluster; only the **database name** should differ from **`DB_NAME`** when Vendure uses **`vendure`**. Set **`DB_SSL_REJECT_UNAUTHORIZED=false`** on the **same component** as Vendure so TLS matches `vendure-config.ts` (required for DigitalOcean Managed Postgres).

4. **Trusted sources (required):** DigitalOcean → **Databases** → select your Postgres cluster → **Settings** → **Trusted sources** → **Edit** → add **Apps / App Platform** and choose the app that runs **hungerhankerings** (this Docker service). If the app is not trusted, connections stall and logs show **`Connection terminated due to connection timeout`**.

## Resend

1. Get an API key from [resend.com](https://resend.com)
2. Verify your domain in Resend (e.g. `hungerhankerings.com`) so you can send from your own address
3. Add to `.env`:

   ```
   RESEND_API_KEY=re_xxxx
   LEAD_EMAIL_TO=hello@hungerhankerings.com
   LEAD_EMAIL_FROM=Hunger Hankerings <hello@hungerhankerings.com>
   ```

- `LEAD_EMAIL_TO` – Comma-separated list of recipients for lead notifications (optional: defaults to **hello@hungerhankerings.com** when unset)
- `LEAD_EMAIL_FROM` – Sender address (must use a verified domain in Resend)

## Spam protection

`lib/spam-guard.ts` guards `POST /api/leads` in three layers. Most bots skip the form and POST JSON
straight at the API, so the request-shape checks catch the bulk of them:

1. **Request shape** — the `Origin`/`Referer` host must belong to this site (**403** otherwise), the
   hidden `website` honeypot must be empty, and the form must report a `formStartedAt` between 2.5 s
   and 12 h old. Bodies over 20 KB are rejected (**413**) and only the known fields
   (`reason, name, email, company, phone, message`) are stored — bots can no longer pad the JSONB
   payload with arbitrary keys.
2. **Throttling** — per IP (3 per 10 min, 10 per day), per email address (5 per day), a site-wide
   flood ceiling (40 per 10 min), and duplicate-body suppression for 24 h. This state is per
   container and resets on deploy, so **both** nginx configs also rate-limit `= /api/leads`
   (`zone=leads`, 6 r/m) as the restart-proof layer — see the environments table below.
3. **Content scoring** — weighted heuristics (links, SEO/crypto/adult/loan pitches, markup or script
   injection, non-Latin bodies, disposable email domains, shouting, duplicated fields). Score ≥ 4
   **quarantines**, score ≥ 6 **drops**.

### Client IP (why the limits don't hit real customers)

The first `X-Forwarded-For` entry is attacker-controlled and the last is whichever proxy spoke to us,
so `getClientIp` takes the right-most **public** address (or `CF-Connecting-IP` when `CF-Ray` proves
the request came through Cloudflare). If only internal addresses are available it returns
`"unknown"`, which disables *only* the per-IP limits — keying a limit on a load-balancer address
would throttle every customer at once. On App Platform, `X-Real-IP` **is** the load balancer, so
nginx sets `real_ip_header X-Forwarded-For` with `real_ip_recursive on` to recover the visitor for
both nginx's own zones and the header passed to Next.

If a platform ever appends a *public* proxy hop, set `LEADS_TRUSTED_PROXY_HOPS=1` to drop it. The
`[leads] rejected submission: rate_limited:*` logs print the resolved IP, so this is diagnosable.
Rejected and dropped requests get a **`200`** so bots do not learn which field tripped them; every
decision is logged as `[leads] rejected submission: <reason>`.

**Quarantined** submissions are saved with `type = "inquiry-spam"` and a `payload._spam`
(`score`, `reasons`) and **never** send a notification email. Review them under
**Ops → Leads → Quarantined spam** and delete them once checked — that tab is the place to look if a
customer says their message never arrived. Tune the ceilings with the `LEADS_MAX_*` env vars in
`.env.example`.

### Cloudflare Turnstile (recommended)

Turnstile is the only layer that survives a restart *and* stops a distributed bot, so enable it if
spam continues:

1. Create a widget at Cloudflare → **Turnstile** for `hungerhankerings.com`.
2. Set **both** keys — the form only renders the widget when the site key is present, and the API
   only enforces verification when the secret is present:

   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...
   TURNSTILE_SECRET_KEY=0x4AAAA...
   ```

   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be a **build-time** variable on DigitalOcean App Platform.
3. Mind the CSP — without `https://challenges.cloudflare.com` allowed, the widget silently fails to
   load and **every** submission is rejected as unverified. Only the droplet stack sends a CSP, and
   it already allows it.

> **Do not set `TURNSTILE_SECRET_KEY` before this code is deployed.** Older builds never loaded
> Cloudflare's `api.js`, so no token is ever produced and enabling the secret rejects every genuine
> submission.

### The two environments (they use different nginx configs)

| | Production: App Platform | Droplet (Compose) |
|---|---|---|
| Deploy | `deploy_on_push` from `main` (`deploy/app-platform/app.spec.do.yaml`) | `deploy/droplet-deploy-remote.sh` |
| nginx | `deploy/app-platform/nginx-main.conf` + `nginx-app.conf.template` | `nginx/nginx.conf` |
| CSP | none by design (it broke Clerk), so Turnstile loads freely | set here, allows Turnstile |
| Real client IP | `real_ip_recursive` over `X-Forwarded-For` (LB in front) | direct peer, same directives for safety |

Changes to the anti-spam nginx layer must be made in **both** places or production will silently miss
them.

Cloudflare's test keys (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`) always
pass and are handy for verifying the wiring before switching to live keys.

## Failure behavior

- If no URL can be resolved (**`LEADS_DATABASE_URL`**, **`DATABASE_URL`**, or complete **`DB_*`** + password), the API returns **503** and the form shows an error (nothing is stored).
- If **`RESEND_API_KEY`** is missing or Resend rejects the send, the response may still be **200** (email runs in the background); errors are logged with **`notification email failed (async)`**. Fix Resend / domain verification and rely on the stored lead or logs.

## CRM integration (future)

The `leads` table stores `type` and `payload` (JSONB). You can add a sync job, webhook, or export to push leads to HubSpot, Salesforce, etc. when you choose a CRM.
