# Hunger Hankerings

Modern headless ecommerce rebuild for hungerhankerings.com using Next.js 15, Saleor, Tailwind, and Docker.

## Monorepo Structure

```
storefront/   Next.js 15 storefront
deploy/       Nginx config for DigitalOcean
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

Copy and edit the example:

```
cp storefront/.env.example storefront/.env
```

### 3) Start Saleor + Postgres + Redis

```
pnpm docker:up
```

Saleor API: http://localhost:8000/graphql/
Saleor Dashboard: http://localhost:9000
Mailpit (dev inbox): http://localhost:8025

### 4) Initialize Saleor

```
docker compose run --rm saleor-api python manage.py migrate
docker compose run --rm saleor-api python manage.py createsuperuser
```

### 5) Configure Saleor channel + products

- Create a channel named `default-channel` in the Saleor Dashboard.
- Add the 7 snack box products and assign them to the channel.

**Snack box sizes and gift option (optional):**

- **Sizes:** Create a product attribute (e.g. `Size`) with values: Small, Medium, Large, X-Large. Assign it to your snack box product type and create one variant per size (or per size × gift combination).
- **Gift option:** Create a second attribute (e.g. `Gift option`) with values: Standard, Gift Box. Create variants that include “Gift Box” and set a higher price for those (gift wrapping + gift card). The storefront shows separate **Size** and **Gift option** dropdowns and resolves the correct variant and price automatically. See `storefront/docs/SALEOR-SNACK-BOX-SETUP.md` for step-by-step Saleor setup.

### 6) Run the storefront

```
pnpm dev
```

Storefront: http://localhost:3000

## Lead Submissions

Lead forms now post to `POST /api/leads` inside the Next.js app. The current
handler logs submissions to the server console and should be replaced with
an email provider or CRM integration for production.

## Docker

Start the full stack:

```
pnpm docker:up
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
Update `storefront/.env`:

```
NEXT_PUBLIC_SALEOR_API_URL=https://api.hungerhankerings.com/graphql/
NEXT_PUBLIC_SALEOR_CHANNEL=default-channel
```

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
- `pnpm docker:up` - Build and run Saleor + storefront services

## Quick Verification

1. Open `http://localhost:3000` and confirm homepage sections render.
2. Visit `/themed-snack-boxes` and verify products appear from Saleor.
3. Add a product to cart and proceed to `/checkout`.
4. Submit a lead form and verify it logs in the Next.js console.
