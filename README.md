# Hunger Hankerings

Modern headless ecommerce for hungerhankerings.com using Next.js 15, Vendure, Tailwind, and Docker.

## Monorepo Structure

```
apps/vendure/   Vendure server + worker + custom shipping plugin
storefront/     Next.js 15 storefront
deploy/         Nginx config for DigitalOcean
```

## Local Development

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker

### 1) Install dependencies

```
pnpm install
```

### 2) Set environment variables

```
cp storefront/.env.example storefront/.env
cp .env.example .env
```

### 3) Start Vendure + Postgres + Redis (local profile)

```
docker compose --profile local up -d
docker compose --profile local run --rm vendure node dist/migrate.js
```

Vendure Shop API: http://localhost:3000/shop-api  
Vendure Admin: http://localhost:3000/admin  
Storefront (in Docker): http://localhost:3001  
Mailpit: http://localhost:8025  

### 4) Run the storefront (dev)

### 5) (Optional) Configure products in Vendure Admin

- Create products and assign to the default channel in Vendure Admin (http://localhost:3000/admin).

- **Gift option:** Create a second attribute (e.g. `Gift option`) with values: Standard, Gift Box. Create variants that include “Gift Box” and set a higher price for those (gift wrapping + gift card). The storefront shows separate **Size** and **Gift option** dropdowns and resolves the correct variant and price automatically. See Vendure docs for product and variant setup.

### 6) Run the storefront

```
pnpm dev
```

Storefront: http://localhost:3000

## Lead Submissions

The storefront `/contact` form and related CTAs post to `POST /api/leads` with
`type: "inquiry"` (reason, name, email, etc.). **Shop/catalog/checkout use Vendure over HTTP**, not Postgres from Next.
Only **`lib/db.ts`** (leads API + ops inbox) connects to Postgres; use **`LEADS_DATABASE_NAME`** /
**`LEADS_DATABASE_URL`** for **`hungerhankeringsadmin`** while keeping **`DB_NAME=vendure`** for Vendure.
Email: **`RESEND_API_KEY`** + verified **`LEAD_EMAIL_FROM`** (recipient defaults to **hello@hungerhankerings.com**).
The HTTP response succeeds after the DB insert; notification send runs afterward. See `storefront/docs/LEADS-SETUP.md`.

## Docker

Start the full stack (with Vendure and optional local Postgres):

```
docker compose --profile local up -d
```

## DigitalOcean Deployment Guide

### Droplet setup
1. Create an Ubuntu 22.04 droplet.
2. Point `hungerhankerings.com`, `api.hungerhankerings.com`, and `admin.hungerhankerings.com` to the droplet.
3. Install Docker + Docker Compose.

```
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

### Environment variables
Copy `deploy/env.production.example` to `.env` on the droplet and set `DB_*`, `COOKIE_SECRET`, `APP_URL`, `NEXT_PUBLIC_VENDURE_SHOP_API_URL`, etc.

### Start services

```
docker compose up -d --build
```

### Nginx reverse proxy

Use `deploy/nginx-hungerhankerings.conf` and enable it in `/etc/nginx/sites-enabled`.

### SSL (LetsEncrypt)

```
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hungerhankerings.com -d api.hungerhankerings.com -d admin.hungerhankerings.com
```

## Scripts

- `pnpm dev` - Run storefront
- `pnpm docker:up` - Build and run Vendure + storefront (use `--profile local` for Postgres)

## Quick Verification

1. Open `http://localhost:3000` and confirm homepage sections render.
2. Visit `/themed-snack-boxes` and verify products appear from Vendure.
3. Add a product to cart and proceed to `/checkout`.
4. Submit a lead form and verify it logs in the Next.js console.
