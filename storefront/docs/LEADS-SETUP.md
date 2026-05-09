# Lead / Inquiry Forms Setup

The unified contact form on `/contact` (and site CTAs with `?reason=`) posts to `/api/leads` with **`type: "inquiry"`** and a **`reason`** field (see `lib/contact-inquiry.ts`). The handler:

1. **Saves** each submission to the **`leads`** table in the database pointed to by **`DATABASE_URL`** (use your ops DB, e.g. **`hungerhankeringsadmin`**, not the Vendure `vendure` database).
2. **Queues** an email notification via **Resend** after the HTTP response (defaults to **hello@hungerhankerings.com** when `LEAD_EMAIL_TO` is unset). The browser sees success as soon as the row is saved so gateways do not **504** while Resend runs.

If Resend fails, check runtime logs for `notification email failed (async)` (the lead row still exists).

## PostgreSQL (Digital Ocean)

1. Create a database in your Digital Ocean control panel (e.g. `hungerhankeringsadmin`) if you have not already.
2. Apply Prisma migrations on that database (from repo `storefront/`). `DATABASE_URL` is read from `prisma.config.ts` (and `.env` via `dotenv`):

   ```bash
   export DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/hungerhankeringsadmin"
   npx prisma migrate deploy
   ```

3. Add to **App Platform / Docker** env for the **storefront** (same component as Next):

   ```
   DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/hungerhankeringsadmin
   ```

   Use the same host/port/user/password as your cluster; only the **database name** should be the ops DB. On the same component as Vendure, set **`DB_SSL_REJECT_UNAUTHORIZED=false`** so the storefront Postgres client relaxes TLS verification (typical for DO Managed Postgres).

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

- If **`DATABASE_URL`** is missing, the API returns **503** and the form shows an error (nothing is stored).
- If **`RESEND_API_KEY`** is missing or Resend rejects the send, the response may still be **200** (email runs in the background); errors are logged with **`notification email failed (async)`**. Fix Resend / domain verification and rely on the stored lead or logs.

## CRM integration (future)

The `leads` table stores `type` and `payload` (JSONB). You can add a sync job, webhook, or export to push leads to HubSpot, Salesforce, etc. when you choose a CRM.
