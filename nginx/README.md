# Nginx reverse proxy with rate limiting

Use this so all traffic goes through Nginx on port 80 with rate limits. You then only need to open ports 22 and 80 on the droplet.

## Rate limits (per client IP)

| Path | Limit | Burst |
|------|--------|-------|
| `/graphql/` (Saleor API) | 10 req/s | 20 |
| `/dashboard/` | 30 req/s | 30 |
| `/` (storefront) | 30 req/s | 50 |

Up to 20 concurrent connections per IP (all paths).

## Run with Nginx

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml -f docker-compose.nginx.yml up -d
```

## URLs when using Nginx

- **Storefront:** `http://YOUR_IP/` or `http://yourdomain.com/`
- **Saleor API (GraphQL):** `http://YOUR_IP/graphql/`
- **Saleor Dashboard:** `http://YOUR_IP/dashboard/`

## .env when using Nginx

Point the app at the same host so the browser uses the rate-limited path:

- `PUBLIC_URL` = `http://YOUR_IP/graphql/` or `https://yourdomain.com/graphql/`
- `NEXT_PUBLIC_SALEOR_API_URL` = same (storefront build)
- `PUBLIC_API_URL` = same (dashboard)
- `ALLOWED_HOSTS` = your IP and/or domain

Rebuild the storefront after changing `NEXT_PUBLIC_SALEOR_API_URL` so the client bundle uses the correct API path.

## Firewall

With Nginx in front, you can close 3000, 8000, 9000 and allow only 22 and 80:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw --force enable
```
