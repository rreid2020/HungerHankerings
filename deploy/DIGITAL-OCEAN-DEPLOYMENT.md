# Deploying Hunger Hankerings to Digital Ocean

This doc outlines how to deploy the full stack (Next.js storefront, Saleor API, worker, dashboard, Postgres, Redis) to Digital Ocean and what to plan for.

---

## What You’re Deploying

| Component | Role | Notes |
|-----------|------|--------|
| **Storefront** | Next.js 15 (port 3000) | `storefront/`, Dockerfile present |
| **Saleor API** | GraphQL API (port 8000) | `ghcr.io/saleor/saleor:3.20` |
| **Saleor Worker** | Celery (async tasks) | Same image, different command |
| **Saleor Dashboard** | Admin UI (port 9000) | `ghcr.io/saleor/saleor-dashboard:3.20` |
| **Postgres** | Saleor database | Persistent data |
| **Redis** | Cache + Celery broker | Required by Saleor |
| **Nginx** | Reverse proxy | `deploy/nginx-hungerhankerings.conf` |

Domains (from your nginx config): `hungerhankerings.com`, `api.hungerhankerings.com`, `admin.hungerhankerings.com`.

---

## Deployment Options on Digital Ocean

### Option A: Single Droplet (what the README describes)

- **What:** One Ubuntu Droplet, Docker Compose runs everything, Nginx in front.
- **Pros:** Simple, full control, one bill, matches your current `docker-compose.yml` and `deploy/nginx-hungerhankerings.conf`.
- **Cons:** You manage OS, backups, and scaling; single point of failure.
- **Best for:** First production deploy, low–medium traffic.

**Rough sizing:** 2 GB RAM minimum (4 GB safer for Saleor + Postgres + Redis + storefront). Use the existing README steps: Droplet → Docker → Nginx → Certbot.

---

### Option B: Digital Ocean App Platform

- **What:** Storefront and/or Saleor as “Apps,” optionally Postgres and Redis as managed components.
- **Pros:** No server admin, auto SSL, easy rollbacks, scale components independently.
- **Cons:** Cost can be higher; Saleor’s Docker setup and Celery worker need to map to App Platform “services” and “workers”; media storage needs a space or external storage.
- **Best for:** When you want managed hosting and are okay adapting the stack to App Platform’s model.

**High level:** Create an App per “service” (storefront, Saleor API, worker, dashboard), or run the API + worker + dashboard from one repo with a `docker-compose`-style build. Use managed Postgres and Redis add-ons, or connect to external DB/Redis.

---

### Option C: Droplet + Managed Database

- **What:** One or more Droplets for app services (Docker Compose), Digital Ocean Managed Postgres (and optionally Managed Redis) for persistence. You can create a new database (and schema) on an **existing managed DB cluster**.
- **Pros:** Managed backups and patches for DB; you still run app stack on a Droplet as you do today.
- **Cons:** Slightly more setup (VPC, connection strings) and higher cost than “Postgres in Docker.”
- **Best for:** When you want reliable DB backups and less DB ops without moving to full PaaS.

**Do I need Spaces?** No. Option C does **not** require Digital Ocean Spaces. Spaces is object storage (like S3) and is **optional**—only relevant if you want Saleor media (product images, uploads) stored in object storage so they survive Droplet rebuilds and are easy to back up. With Option C you can start by storing Saleor media on a **Docker volume on the Droplet**; add Spaces later if you want durable, off-server media storage.

---

## Using your DigitalOcean managed Postgres (Option C)

Only **Saleor** (API and worker) uses a database. To use your existing managed Postgres cluster (e.g. `db-postgresql-tor1-60715`) for Hunger Hankerings:

### 1. Get the connection string from DigitalOcean

- In the DO control panel: **Databases** → your cluster → **Connection Details** (or **Connection Parameters**).
- Use the **connection string** (or build it from host, port, user, password, database).  
- Managed Postgres usually requires **SSL**. Add `?sslmode=require` to the URL, e.g.  
  `postgres://user:password@host:port/dbname?sslmode=require`
- If you use the **private** (VPC) host, ensure your Droplet is in the **same VPC and region** as the database so it can reach it. Otherwise use the **public** host and add your Droplet’s IP to **Trusted Sources** for the database.

### 2. Create a database and user for Saleor (optional but recommended)

On the cluster you can create a dedicated database (e.g. `saleor`) and a user with access to it, so Saleor doesn’t share a DB with other apps. Use the DO UI (**Users & Databases** tab) or connect with `psql` and run:

```sql
CREATE DATABASE saleor;
CREATE USER saleor WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE saleor TO saleor;
```

Then use a URL like:  
`postgres://saleor:your-secure-password@your-db-host:25060/saleor?sslmode=require`

### 3. On the Droplet: set `DATABASE_URL` and use the prod compose file

In the project root (e.g. `/root/HungerHankerings`), create or edit `.env` and set:

```bash
DATABASE_URL=postgres://user:password@host:port/dbname?sslmode=require
```

Use the rest of the production checklist (e.g. `SECRET_KEY`, `ALLOWED_HOSTS`, `EMAIL_URL`, `DEBUG=0`). Then run:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache storefront
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Do not** use `--profile local`; the local Postgres service is only for development. With `docker-compose.prod.yml`, Saleor API and worker use `DATABASE_URL` from `.env` and do not start the in-container Postgres.

### 4. Run Saleor migrations (first time only)

If the managed database is empty, Saleor must run migrations. Exec into the API container and run them, or use the Saleor image’s migrate command, for example:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec saleor-api python manage.py migrate
```

(Exact command may vary by Saleor version; check the image docs if this fails.)

### Local development (with local Postgres)

To run the stack **locally** with the in-container Postgres, use the `local` profile:

```bash
docker compose --profile local up -d
```

---

## Production Checklist (any option)

- **Environment variables**
  - Storefront: `NEXT_PUBLIC_SALEOR_API_URL=https://api.hungerhankerings.com/graphql/`, `NEXT_PUBLIC_SALEOR_CHANNEL`, plus any secrets (no secrets in `NEXT_PUBLIC_*`).
  - Saleor: `ALLOWED_HOSTS` (all public hostnames), `SECRET_KEY`, real `DATABASE_URL`, `REDIS_URL`, `EMAIL_URL` (or SMTP), `CELERY_*` URLs. Remove `DEBUG=1` and set `DEBUG=0`.
- **SSL:** Use Certbot + Nginx (Droplet) or App Platform’s built-in SSL. Redirect HTTP → HTTPS.
- **Saleor media:** Use a **persistent Docker volume** on the Droplet (simplest for Option C), or optionally DO Spaces (object storage) for durable, off-server media. don’t rely only on the container filesystem (no volume).
- **Email:** Replace Mailpit with real SMTP or a transactional provider (SendGrid, Postmark, etc.); set `EMAIL_URL` / `DEFAULT_FROM_EMAIL` in Saleor.
- **Backups:** At least Postgres (daily); optionally Redis if you store important data there. DO Managed DB includes backups; on a Droplet, use `pg_dump` + cron or a backup tool.
- **Monitoring / health:** Simple uptime checks on `https://hungerhankerings.com` and `https://api.hungerhankerings.com/graphql/`; consider DO Monitoring or an external service.
- **CI/CD (optional):** GitHub Actions (or similar) to build and push images, then deploy to a Droplet (SSH + `docker compose pull && docker compose up -d`) or trigger App Platform deploy.

---

## Recommended path from “thinking” to “live”

1. **Short term:** Use **Option A (single Droplet)** with your existing `docker-compose.yml` and `deploy/nginx-hungerhankerings.conf`. Add production env vars, Certbot, and a plan for Saleor media and email. This gets you live with minimal change.
2. **Next:** Add managed Postgres (**Option C**) when you want automated backups and fewer DB chores.
3. **Later:** Consider App Platform (**Option B**) if you want to stop managing the server and are ready to adapt the stack to App Platform’s services/workers.

---

## Quick reference: Single-Droplet commands

After the Droplet is set up and DNS points to it:

**Option A (Postgres in Docker):**

```bash
cd /root/HungerHankerings
# Set production .env (no DATABASE_URL needed; local postgres runs)
docker compose --profile local build --no-cache storefront
docker compose --profile local up -d
```

**Option C (managed Postgres):**

```bash
cd /root/HungerHankerings
# Set .env with DATABASE_URL (and other production vars)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache storefront
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Nginx: copy `deploy/nginx-hungerhankerings.conf` into `/etc/nginx/sites-enabled/`, then:

```bash
sudo certbot --nginx -d hungerhankerings.com -d api.hungerhankerings.com -d admin.hungerhankerings.com
```
