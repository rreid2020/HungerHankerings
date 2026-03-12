# Phishing / abuse report remediation (Droplet)

If DigitalOcean or another party reports that your droplet may be hosting phishing or abusive content, follow these steps on the droplet to locate and remove it and reduce future risk.

## 1. Find what is being served

SSH into the droplet, then:

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
```

**Recent nginx access (see which URLs were hit):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml logs nginx --tail=500 2>/dev/null | grep -E "GET|POST" || true
```

If you have nginx access logs on the host (e.g. under `/var/log/nginx/`), inspect those for suspicious paths (login pages, bank names, etc.).

**Files under Vendure assets (uploaded content):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml exec vendure find /app/assets -type f 2>/dev/null || true
docker volume inspect hungerhankerings_vendure_assets 2>/dev/null
# List files in the volume (from host):
docker run --rm -v hungerhankerings_vendure_assets:/assets alpine ls -laR /assets 2>/dev/null || true
```

**Search for HTML in asset volume (possible phishing pages):**

```bash
docker run --rm -v hungerhankerings_vendure_assets:/assets alpine find /assets -type f \( -name '*.html' -o -name '*.htm' \) 2>/dev/null || true
```

If you find `.html`/`.htm` files in assets that you did not upload, remove them (see step 2).

**Check for other web roots or suspicious configs:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml ps
# Ensure no extra containers or mounts are serving unknown content
grep -r "proxy_pass\|root\|alias" /root/HungerHankerings/nginx/ 2>/dev/null
```

## 2. Remove malicious or unknown content

- **Vendure assets:** If you found HTML or other suspicious files in the asset volume, delete them. Example (from host, after identifying the path):

  ```bash
  docker run --rm -v hungerhankerings_vendure_assets:/assets alpine sh -c 'find /assets -type f \( -name "*.html" -o -name "*.htm" \) -delete'
  ```

  Or remove a single file:

  ```bash
  docker run --rm -v hungerhankerings_vendure_assets:/assets alpine rm -f /assets/path/to/file.html
  ```

- **Storefront/Vendure code:** If your app was compromised, restore from a known-good commit and rotate secrets (DB, COOKIE_SECRET, SUPERADMIN password, etc.).

## 3. Harden the server (already in repo)

This repo includes:

- **Nginx:** Blocking of `.html`/`.htm` under `/assets/` (return 404), and security headers (X-Content-Type-Options, CSP, X-Frame-Options, etc.). Deploy the latest `nginx/nginx.conf` and reload nginx (step 4).

- **Vendure:** Production CORS restricted to `APP_URL`; warnings for default COOKIE_SECRET/SUPERADMIN. Set strong `COOKIE_SECRET`, `SUPERADMIN_USERNAME`, and `SUPERADMIN_PASSWORD` in `.env`.

## 4. Apply config and reload nginx

After pulling the latest code (with nginx and doc updates):

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d --force-recreate nginx
# Or just reload config without full recreate:
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml exec nginx nginx -s reload
```

## 5. Optional: Stop serving the app on the raw IP

If the report is about the droplet **IP** (e.g. 143.110.221.220) being used in phishing links, you can make nginx **only** respond when the request `Host` is your real domain(s). Requests to `http://143.110.221.220` would then get a closed connection or minimal response instead of your store.

1. In `nginx/nginx.conf`, change `server_name _;` to your domain(s), e.g.:

   ```nginx
   server_name yourdomain.com www.yourdomain.com;
   ```

2. Add a **default** server that catches any other Host (including the IP) and closes the connection:

   ```nginx
   server {
       listen 80 default_server;
       server_name _;
       return 444;
   }
   ```

   Put this **after** your main `server { ... }` block so the main block is tried first when Host matches. Then reload nginx as in step 4.

Result: Only requests with `Host: yourdomain.com` (or your other names) get the app; requests to the IP or unknown Host get no response (444).

## 6. Report back to DigitalOcean

After you’ve removed any abusive content and hardened the server, reply to DO’s notice and state that you:

- Identified and removed any phishing/abusive content (or confirmed none was found).
- Restricted HTML in uploaded assets and added security headers.
- Optionally restricted serving to your domain only so the bare IP no longer serves the app.

Keeping backups and logs of what you removed can help if DO asks for details.
