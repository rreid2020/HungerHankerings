# Lead / Inquiry Forms Setup

The unified contact form on `/contact` (and site CTAs with `?reason=`) posts to `/api/leads` with **`type: "inquiry"`** and a **`reason`** field (see `lib/contact-inquiry.ts`). The handler:

1. **Saves** each submission to the **`leads`** table in the database pointed to by **`DATABASE_URL`** (use your ops DB, e.g. **`hungerhankeringsadmin`**, not the Vendure `vendure` database).
2. **Sends** an email notification via **Resend** (defaults to **hello@hungerhankerings.com** when `LEAD_EMAIL_TO` is unset).

Both must succeed for the user to see a success message (if email fails after save, the API returns **502** with guidance to email directly).

## PostgreSQL (Digital Ocean)

1. Create a database in your Digital Ocean control panel (e.g. `hungerhankeringsadmin`) if you have not already.
2. Run the schema to create the `leads` table **on that database**:

   ```bash
   psql $DATABASE_URL -f scripts/init-leads-db.sql
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
- If **`RESEND_API_KEY`** is missing or Resend rejects the send, the lead may already be stored; the API returns **502** with a message to email **hello@hungerhankerings.com** directly (check runtime logs and fix Resend / domain verification).

## CRM integration (future)

The `leads` table stores `type` and `payload` (JSONB). You can add a sync job, webhook, or export to push leads to HubSpot, Salesforce, etc. when you choose a CRM.
