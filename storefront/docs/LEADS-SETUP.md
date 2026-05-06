# Lead / Inquiry Forms Setup

The unified contact form on `/contact` (and site CTAs with `?reason=`) posts to `/api/leads` with **`type: "inquiry"`** and a **`reason`** field (see `lib/contact-inquiry.ts`). The handler:

1. **Saves** each submission to a PostgreSQL database
2. **Sends** an email notification via Resend to Hunger Hankerings

## PostgreSQL (Digital Ocean)

1. Create a database in your Digital Ocean control panel
2. Run the schema to create the `leads` table:

   ```bash
   psql $DATABASE_URL -f scripts/init-leads-db.sql
   ```

3. Add to `.env`:

   ```
   DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
   ```

   Digital Ocean provides the connection string in the database details. Use `?sslmode=require` for SSL.

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

## Fallback behavior

- If `DATABASE_URL` is not set, leads are not saved to the database (email still sends when Resend is configured)
- If `RESEND_API_KEY` is not set, emails are not sent
- The form still returns success to the user; missing config is logged server-side

## CRM integration (future)

The `leads` table stores `type` and `payload` (JSONB). You can add a sync job, webhook, or export to push leads to HubSpot, Salesforce, etc. when you choose a CRM.
