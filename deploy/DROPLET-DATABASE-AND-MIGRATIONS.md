# Database setup and Vendure on the Droplet

Use this guide after you have:
- A DigitalOcean Droplet with the Hunger Hankerings project at `/root/HungerHankerings`
- A DigitalOcean managed Postgres cluster (or another PostgreSQL server)
- A database named **vendure** (or create one) on that cluster
- `.env` on the Droplet with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `COOKIE_SECRET`, etc. (see deploy/env.production.example)

---

## Where you run commands

- **Your PC:** Only for uploading files (e.g. `scp`).
- **Droplet (DO Web Console or SSH):** All setup, `.env`, Docker, and migrations.

---

## Step 1: Point `.env` at the Vendure database (Droplet)

**Where:** DigitalOcean Droplet.

**What:** Set database and Redis variables in `.env` for Vendure.

1. Copy the example and edit:
   ```bash
   cd /root/HungerHankerings
   cp deploy/env.production.example .env
   nano .env
   ```

2. Set at least:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (your Postgres connection). Use a **dedicated database** for Vendure (e.g. `vendure`). Do not use `saleor` or `defaultdb`—the migrate script will refuse to run.
   - `REDIS_HOST`, `REDIS_PORT` (use `redis` when using Docker; Redis runs in the same compose)
   - `COOKIE_SECRET` (e.g. `openssl rand -hex 32`)
   - `APP_URL` (e.g. `https://yourdomain.com` or `http://YOUR_IP`)
   - `NEXT_PUBLIC_VENDURE_SHOP_API_URL` (URL the browser uses for Shop API, e.g. `https://yourdomain.com/shop-api` or `http://YOUR_IP/shop-api`)

3. Save and exit: **Ctrl+O**, Enter, then **Ctrl+X**.

---

## Step 2: Install Docker on the Droplet (if not already installed)

**Where:** Droplet.

```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
docker --version
docker compose version
```

---

## Step 3: Run Vendure migrations

**Where:** Droplet.

**What:** Run Vendure migrations so the database has the correct schema. Run a one-off container:

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm vendure node dist/migrate.js
```

(If your project uses `npm run migrate` in the Vendure app, you may instead run that inside the container. Adjust the command if the migrate script name differs.)

---

## Step 4: Create superadmin (first run)

**Where:** Droplet.

**What:** Vendure creates the superadmin from env vars `SUPERADMIN_USERNAME` and `SUPERADMIN_PASSWORD` on first start, or you can run a one-off bootstrap. See apps/vendure README. Ensure these are set in `.env` before the first `docker compose up`.

---

## Step 5: Start the full stack (with Nginx)

**Where:** Droplet.

**What:** Build and start Vendure server, worker, storefront, Redis, and Nginx.

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d --remove-orphans
```

Check that containers are running:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml ps
```

- Port 80: Nginx (storefront at `/`, Shop API at `/shop-api`, Admin at `/admin`)
- No JWT or RSA key is required for Vendure.

---

## Summary: order of commands on the Droplet

| Step | Where   | Action |
|------|--------|--------|
| 1    | Droplet | Create `.env` from deploy/env.production.example; set DB_*, REDIS_*, COOKIE_SECRET, APP_URL, NEXT_PUBLIC_VENDURE_SHOP_API_URL |
| 2    | Droplet | Install Docker and Docker Compose |
| 3    | Droplet | Run Vendure migrations (one-off vendure container) |
| 4    | Droplet | Set SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD in `.env` for first start |
| 5    | Droplet | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml build --no-cache` then `... up -d --remove-orphans` |

All of these commands are run **on the Droplet**. No `jwt_key.pem` or Saleor-specific steps are used.
