# Fixing 502 Bad Gateway (Droplet)

A 502 means Nginx got an invalid response from the backend (Vendure or Storefront). Follow these steps on the droplet.

## 0. Verify migration target (before running migrations)

Before running any migration, confirm that the **one-off migrate container** will use the same DB as your production app (and as the DB you see in pgAdmin).

**On the droplet:**

1. **`.env` must exist at project root** (same directory as `docker-compose.yml`):
   ```bash
   cd /root/HungerHankerings
   ls -la .env
   ```
   If missing, create it from `.env.example` and fill in your DigitalOcean managed Postgres values.

2. **Check that DB variables match your intended production DB** (host, port **25060**, database name). Do **not** paste the file; use:
   ```bash
   grep -E '^DB_' .env | sed 's/=.*/=***/'
   ```
   You should see lines like `DB_HOST=***`, `DB_PORT=***`, `DB_NAME=***`. Then confirm in the DigitalOcean control panel that:
   - `DB_HOST` is your cluster host (e.g. `xxx.db.ondigitalocean.com`).
   - `DB_PORT` is **25060** (managed Postgres port).
   - `DB_NAME` is the database you want to migrate (e.g. `vendure` — the one you use in pgAdmin). **Do not** use `saleor` or `defaultdb`; the migrate script will refuse to run (to avoid applying Vendure schema to the wrong database).

3. **Load `.env` into the shell** (required so Compose can substitute `${DB_HOST}` etc. into the container):
   ```bash
   set -a && [ -f .env ] && . ./.env && set +a
   ```

4. **Confirm what the migrate container will see** (same env the app uses):
   ```bash
   export COMPOSE_PROJECT_NAME=hungerhankerings
   docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml run --rm vendure env | grep -E '^DB_'
   ```
   Compare `DB_HOST`, `DB_PORT`, and `DB_NAME` with your DO connection details (and the DB you have open in pgAdmin). If they match, the next migration run will hit that database.

**Why this is correct:** The base `docker-compose.yml` sets `DB_HOST=postgres` (local). Prod overrides with `${DB_HOST}` from the shell, so you must run `set -a && [ -f .env ] && . ./.env && set +a` before any prod compose command (migrate or up). Then the migrate container gets your managed DB host.

**Run migration on the droplet** (after the checks above):

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
set -a && [ -f .env ] && . ./.env && set +a
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml run --rm vendure node dist/migrate.js
```

**If deploy runs migrate successfully but Vendure then says "relation administrator does not exist":** The migrate container and the Vendure container are using different databases. On the droplet, (1) ensure `.env` has Unix line endings (no `\r`): run `sed -i 's/\r$//' .env`. (2) Use `--env-file .env` when you run compose: `docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d`. (3) Confirm the running container sees the same DB: `docker compose --env-file .env -f ... exec vendure env | grep -E '^DB_HOST=|^DB_NAME='` and compare to your production DB.

## 1. Check that containers are running

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml ps
```

All services (nginx, vendure, vendure-worker, storefront, redis, mailpit) should show "Up". If **vendure** or **storefront** is "Exit" or missing, that’s the cause.

## 2. Check Vendure logs (most common cause of 502)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml logs vendure --tail=80
```

Look for:

- **"relation … does not exist"** → DB not migrated or Vendure using wrong DB. Run migrations (see README), then restart the stack with `.env` loaded.
- **"ECONNREFUSED" / "getaddrinfo"** → Wrong DB host (e.g. still `postgres`). Ensure you start the stack with `.env` loaded (step 4).
- **"Timed out when awaiting the DB schema"** → Same as above; Vendure can’t see the schema.

## 3. Test backend directly (bypass Nginx)

On the droplet:

```bash
# Vendure
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml exec vendure wget -qO- http://localhost:3000/shop-api 2>&1 | head -5

# Or from the host (if vendure exposes port in dev)
curl -s http://localhost:3000/shop-api 2>&1 | head -5
```

If this fails or hangs, the problem is Vendure, not Nginx.

## 4. Start/restart the stack with .env loaded (required for prod DB)

So that Vendure and the migrate step use the same DB, **always** load `.env` before running compose:

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
set -a && [ -f .env ] && . ./.env && set +a
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d --force-recreate
```

Wait ~30–60 seconds, then check:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml logs vendure --tail=30
```

You should see Vendure listening (e.g. "Vendure server listening on port 3000"). Then try the site again.

## 5. If Nginx still returns 502

Increase timeouts in `nginx/nginx.conf` for the location that 502s (e.g. `/admin` or `/shop-api`):

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

Then reload Nginx:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml exec nginx nginx -s reload
```

## Summary

| Symptom | Likely cause | Action |
|--------|---------------|--------|
| vendure container Exited | Crash on startup (often DB) | Check vendure logs; run migrations; start stack with `.env` loaded (step 4). |
| vendure Up but 502 | Vendure not ready or erroring on request | Check vendure logs; increase nginx timeouts if needed. |
| storefront Exited | Build or runtime error | Check storefront logs. |
