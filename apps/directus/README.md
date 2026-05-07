# Directus (internal ops data)

Runs **inside the same Docker image** as Vendure + Next + nginx on App Platform (**one** billable web service). Use it for **employee-only** data (e.g. `leads` in **`hungerhankeringsadmin`**) — **not** a replacement for Vendure.

## Enable

| Variable | Required | Notes |
|----------|----------|--------|
| **`ENABLE_DIRECTUS`** | Yes | Set to **`true`** to start Directus; otherwise the process idles. |
| **`INTERNAL_OPS_HOST`** | For HTTPS access | Bare hostname, e.g. `ops.hungerhankerings.com`. Nginx appends a vhost that proxies here → Directus. Add this domain on the **same** DigitalOcean App. |
| **`PUBLIC_URL`** | Yes | Must match how staff open Directus, e.g. **`https://ops.hungerhankerings.com`**. |
| **`KEY`** | Yes | Random string; **stable** across deploys (encrypts stored tokens). |
| **`SECRET`** | Yes | Random string; **stable** across deploys. |
| **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD`** | First boot | Create the initial Directus admin when the DB is empty. |
| **`DB_CLIENT`** | No | Defaults to **`pg`** in `start.sh` if unset. |

## Database (same cluster as Vendure)

Reuse **`DB_HOST`**, **`DB_PORT`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_SSL__reject_unauthorized`** (or your existing SSL toggle) from Vendure.

**Important:** Vendure uses **`DB_NAME`** (e.g. `vendure`). Directus uses **`DB_DATABASE`** (e.g. `hungerhankeringsadmin`). Set **both** so each process connects to the correct database. Directus does **not** read `DB_NAME`.

```text
DB_CLIENT=pg
DB_DATABASE=hungerhankeringsadmin
DB_SSL__reject_unauthorized=false   # typical for DO Managed Postgres
```

Run `storefront/scripts/init-leads-db.sql` (or your schema) against **`DB_DATABASE`** before or after enabling Directus.

## DNS & App Platform

1. **Domains:** Add **`ops.yourdomain.com`** to the **same** App component as production.
2. **Env:** `INTERNAL_OPS_HOST=ops.yourdomain.com`, `PUBLIC_URL=https://ops.yourdomain.com`.
3. Redeploy. Logs should show Directus listening on **`127.0.0.1:8055`**; only nginx reaches it.

## Security

- Do not link the ops hostname from the public storefront.
- Prefer **runtime-only** env for `KEY`, `SECRET`, `ADMIN_PASSWORD`, `DB_DATABASE`.
- Later: Google Workspace SSO via Directus settings (out of band).

## Local trial

```bash
cd apps/directus
npm install
export ENABLE_DIRECTUS=true KEY=test SECRET=test DB_CLIENT=pg DB_HOST=localhost ...
npm run start
```

## Extensions

Place custom extensions under `./extensions` (bundled into the image).
