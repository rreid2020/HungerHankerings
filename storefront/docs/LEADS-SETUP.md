# Lead / Inquiry Forms Setup

The unified contact form on `/contact` (and site CTAs with `?reason=`) posts to `/api/leads` with **`type: "inquiry"`** and a **`reason`** field (see `lib/contact-inquiry.ts`). The handler:

1. **Saves** each submission to the **`leads`** table only (storefront shop traffic uses **Vendure’s HTTP API**, not direct Postgres). Resolution: **`LEADS_DATABASE_URL`** → if **`DB_*`** is complete, compose with **`LEADS_DATABASE_NAME`** or default **`hungerhankeringsadmin`** (**never** `DB_NAME`, so Vendure can stay on **`vendure`**) → else **`DATABASE_URL`**. On App Platform set **`LEADS_DATABASE_NAME=hungerhankeringsadmin`** (or **`LEADS_DATABASE_URL`**) alongside existing **`DB_NAME=vendure`** for Vendure.
2. **Queues** an email notification via **Resend** after the HTTP response (defaults to **hello@hungerhankerings.com** when `LEAD_EMAIL_TO` is unset). The browser sees success as soon as the row is saved so gateways do not **504** while Resend runs.

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

## Failure behavior

- If no URL can be resolved (**`LEADS_DATABASE_URL`**, **`DATABASE_URL`**, or complete **`DB_*`** + password), the API returns **503** and the form shows an error (nothing is stored).
- If **`RESEND_API_KEY`** is missing or Resend rejects the send, the response may still be **200** (email runs in the background); errors are logged with **`notification email failed (async)`**. Fix Resend / domain verification and rely on the stored lead or logs.

## CRM integration (future)

The `leads` table stores `type` and `payload` (JSONB). You can add a sync job, webhook, or export to push leads to HubSpot, Salesforce, etc. when you choose a CRM.
