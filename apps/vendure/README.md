# Vendure backend

Vendure server and worker for Hunger Hankerings.

## Setup

1. Set environment variables (see root `.env.example` and `deploy/env.production.example`).
2. Ensure PostgreSQL and Redis are running (Docker Compose or managed).
3. Run migrations (when using production with `synchronize: false`):
   From **repo root**: `pnpm run migrate:vendure`. Or from this dir: `pnpm run build` then `pnpm run migrate`. Put prod DB vars in `apps/vendure/.env`.
   (Optional) create a `.env` (or copy from droplet) with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` pointing at the managed DB, then run the same command. Run this before deploying so the droplet’s stack starts against an already-migrated DB.
4. Start the server: `node dist/index.js` (or `pnpm start`).
5. Start the worker: `node dist/worker.js` (or `pnpm start:worker`).

## Admin UI

Open `/admin` (e.g. http://localhost:3000/admin). Log in with `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`.

## Shipping

The custom region-based shipping plugin is registered. In Admin, create a **Shipping Method** and select:

- **Eligibility checker:** Region-based shipping
- **Calculator:** Region-based rate (Toronto / Ontario / Canada / USA / Remote)

Assign the method to your shipping zone(s). Rules: Toronto (M prefix) $10, Ontario $15, Canada $20, remote (NT/YT/NU) $35, USA $30 (prices in CAD cents).

## Payment

A dummy payment handler is configured for development. In Admin, create a Payment Method and choose "Dummy payment". For production, add Stripe or another handler.
