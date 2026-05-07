# DigitalOcean App Platform (single Web Service)

This repo includes a **one-container** production layout: **Vendure** (`127.0.0.1:3000`), **Vendure worker**, **Next.js** (`127.0.0.1:3001`), optional **Directus** (`127.0.0.1:8055`, internal ops DB UI), and **nginx** on **`$PORT`** (App Platform sets this; default **8080**).

Files:

| Path | Purpose |
|------|---------|
| `Dockerfile` (repo root) | Multi-stage build + runtime image (root path so App Platform prefers Docker over Node buildpack) |
| `deploy/app-platform/nginx-main.conf` | `http { … limit_* zones … }` |
| `deploy/app-platform/nginx-app.conf.template` | Server block → `default.conf` at startup |
| `deploy/app-platform/nginx-directus-ops.conf.template` | Optional second `server_name` for Directus (appended when `INTERNAL_OPS_HOST` is set) |
| `deploy/app-platform/supervisord.conf` | Starts vendure, worker, storefront, directus (idle unless enabled), nginx |
| `deploy/app-platform/docker-entrypoint.sh` | Substitutes listen port, runs supervisord |
| `deploy/app-platform/app.spec.example.yaml` | Example App Platform spec |

Build **from the repository root** (`docker build .` or explicitly `docker build -f Dockerfile .`).

## No “Dockerfile path” in the UI? Use the App Spec (YAML)

DigitalOcean does not always show a separate **Dockerfile path** field on the **Source** screen. This repo keeps **`Dockerfile` at the repository root** so App Platform [auto-detects Docker](https://docs.digitalocean.com/products/app-platform/reference/dockerfile/) instead of the root `package.json` (Node buildpack). You can still set **`dockerfile_path: Dockerfile`** explicitly in the app spec (see [Builds with Dockerfiles](https://docs.digitalocean.com/products/app-platform/reference/dockerfile/)).

### Find it in the control panel

1. Log in at [cloud.digitalocean.com](https://cloud.digitalocean.com).
2. Left sidebar: **Apps** → click your **app name** (not the droplet).
3. Open the **Settings** tab for that app (top navigation on the app page).
4. Scroll until you see **App spec** (sometimes **Spec**). You should see **Edit**, **Download**, and/or **Upload**.
5. Click **Edit**. You get a YAML editor for the whole app.
6. Under your **Web Service** (the `services:` entry that has `github:`), add a line **next to** the other keys at the same indentation:

   ```yaml
   dockerfile_path: Dockerfile
   ```

7. Ensure **`source_dir`** for that service is **not** set to `deploy/app-platform` only — use the **repo root** (omit `source_dir`, or use `.` / `/` per [App spec reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)).
8. Remove any **`build_command`** / **`run_command`** on that service if they were added for buildpacks, so the image starts from the Dockerfile **`CMD`**.
9. Set **`http_port: 8080`** on that service if it is not already set.
10. Save — the app will redeploy. Official overview: [Update App Spec](https://docs.digitalocean.com/products/app-platform/how-to/update-app-spec/).

### CLI alternative (`doctl`)

If the UI is awkward, use [doctl](https://docs.digitalocean.com/reference/doctl/reference/apps/):

```bash
doctl apps list
doctl apps spec get YOUR_APP_ID > app-spec.yaml
# Edit app-spec.yaml: add dockerfile_path under the web service, fix source_dir, save.
doctl apps update YOUR_APP_ID --spec app-spec.yaml
```

Use a **Personal Access Token** with App read/write when `doctl auth init` prompts you.

## Environment variables

### Copy from your Droplet `.env`

You can reuse **names and values** from `deploy/env.production.example` / your Droplet `.env` for anything that is **not** Docker-specific.

**Change or add these for App Platform:**

| Variable | Notes |
|----------|--------|
| `VENDURE_SHOP_API_URL` | **`http://127.0.0.1:3000/shop-api`** (storefront server-side calls inside the container). |
| `APP_URL` | Public site URL with **`https://`** (same hostname visitors use). |
| `NEXT_PUBLIC_VENDURE_SHOP_API_URL` | **`BUILD_TIME`** — must be the public URL, e.g. `https://your-domain/shop-api`. Changing it requires a **redeploy/rebuild**. |
| `NEXT_PUBLIC_SITE_URL` | **`BUILD_TIME`** — public storefront origin (often same as `APP_URL`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **BUILD_TIME** (publishable key only). |
| Remove / ignore | `REDIS_HOST=redis` unless you add Managed Redis and point the app at it (current Vendure TS does not reference `REDIS_*`). |

Mark secrets (**`DB_PASSWORD`**, **`COOKIE_SECRET`**, **`DO_SPACES_*`**, **`SMTP_PASS`**, Stripe secrets, superadmin password, etc.) as **encrypted / SECRET** in App Platform, not plain text in YAML checked into git.

### Postgres

Allow connections from App Platform to your Managed Database ([trusted sources / dedicated egress IP](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/)). Use the same `DB_*` values as on the Droplet once networking is allowed.

### Spaces

Set all four: `DO_SPACES_BUCKET`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION` — same as Droplet (see `vendure-config.ts`).

### Stripe webhooks

Point webhook URLs at your **new** public hostname (`https://…/payments/…` as configured for Vendure).

### Directus (optional — same component, no extra web service)

Directus runs **inside the same container** on **`127.0.0.1:8055`**. Nginx exposes it only when you set **`INTERNAL_OPS_HOST`** (e.g. `ops.hungerhankerings.com`) and add that hostname to the App’s **Domains** + DNS (same load balancer as the storefront).

| Variable | Notes |
|----------|--------|
| `ENABLE_DIRECTUS` | Set to **`true`** to start Directus; if unset/false, the process idles (minimal RAM). |
| `INTERNAL_OPS_HOST` | Bare hostname only (no `https://`). Required for nginx to route the ops subdomain to Directus. |
| `PUBLIC_URL` | Directus expects its own public base URL, e.g. **`https://ops.hungerhankerings.com`** (match `INTERNAL_OPS_HOST`). |
| `KEY`, `SECRET` | Required random strings when Directus is enabled (keep stable across deploys). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap the first admin on an empty database. |
| `DB_CLIENT` | Usually **`pg`**. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | Same managed Postgres as Vendure (shared). |
| **`DB_DATABASE`** | Directus DB name (e.g. **`hungerhankeringsadmin`**). **Not** `DB_NAME` — Vendure still uses **`DB_NAME=vendure`**. Set **both** names on the same component. |
| `DB_SSL` for Directus | Prefer **`json:{"rejectUnauthorized":false}`** on DO Postgres (see `apps/directus/start.sh`). App Platform may break nested **`DB_SSL__*`** keys. |
| `PUBLIC_URL` vs `APP_URL` | **`PUBLIC_URL`** is for Directus only when enabled; **`APP_URL`** is for Vendure/storefront — set both if both run. |

See `apps/directus/README.md`. Prefer a **subdomain** rather than `/directus` under the storefront path (asset and routing issues).

## Creating the app

1. Connect the GitHub repo in App Platform; leave **Dockerfile at repo root** (or set **Dockerfile path** to `Dockerfile`) and **HTTP port** to **8080**.
2. Add **build-time** variables for `NEXT_PUBLIC_*` (see example spec).
3. Add **runtime** variables (and secrets) from your Droplet `.env`, including `VENDURE_SHOP_API_URL` loopback URL above.
4. Optionally set **health check path** to **`/health`** (proxied to Vendure).

First deploy can take several minutes (npm install + Next build + Vendure compile).

## Troubleshooting

### `failed to launch: determine start command: when there is no default process a command is required`

Usually one of:

1. **Buildpack image, not Docker** — In the deploy log, confirm you see a **Dockerfile** build (layers / `FROM node`), not Node buildpack / Procfile. Fix: remove **`environment_slug`**, ensure a root **`Dockerfile`** exists (this repo) or set **`dockerfile_path: Dockerfile`** in the [app spec](https://docs.digitalocean.com/products/app-platform/reference/app-spec/). Remove any empty **`run_command:`** / **`build_command:`** lines that override the image.
2. **Ignore “add a Procfile”** if the build log shows Docker — that advice applies to **buildpack** deploys only. This app starts via **`CMD ["/docker-entrypoint.sh"]`** in the Dockerfile.
3. **Explicit process** — Redeploy after pulling latest `main` so the runner picks up the current image.

### `Readiness probe failed: … :8080: connect: connection refused`

Nothing is listening on **`PORT`** (8080) yet, or the container exited. Check **Runtime logs** for nginx/supervisord/node errors. Ensure **`http_port: 8080`** matches the image.

### `listen EADDRINUSE 0.0.0.0:8080` (NestApplication / Vendure)

App Platform sets **`PORT=8080`** for the container (matches **`http_port`**). Vendure uses **`process.env.PORT`** for its HTTP server. Our image runs **nginx on `$PORT`** and proxies to Vendure on **3000**. **Supervisord sets `PORT=3000`** for the Vendure and worker processes only so they never compete with nginx for 8080.

### App status **Degraded** (not **Healthy**)

Usually **health checks** hit **`/health`** before Vendure + nginx are ready (first boot does `npm` build inside the image layers — runtime still starts vendure + next + nginx). In the app spec, raise **`health_check.initial_delay_seconds`** (e.g. **120**) and **`timeout_seconds`** (e.g. **15–30**), and keep **`http_path: /health`** (proxied to Vendure in `nginx-app.conf.template`). After deploy, open **Runtime logs** and confirm no crash loop (DB SSL, missing `COOKIE_SECRET`, bad `APP_URL` typos like `https://https://`).

If logs show **Vendure started** but DO stays **Degraded**, the probe may be timing out on Vendure’s **database health ping** (default TypeORM check). This repo **disables DB checks on `/health` by default** so the platform sees a fast **200** once Nest is up. To restore the DB probe (e.g. for your own monitoring), set runtime **`VENDURE_HEALTHCHECK_DATABASE=true`**.

**Env typos that break health / APIs:** `https://https://…`, `…//shop-api`, `APP_URL` ending in **`/.com`**, or **`DO_SPACES_*`** values pasted **with quote characters** — the secret value must be the raw key, not `"key"` in quotes.

### `Unlinking stale socket /run/supervisor.sock` (repeating)

Supervisord was restarting quickly and fighting a leftover RPC socket. The image **disables the RPC socket** (no `unix_http_server`) and uses **`/tmp/supervisord.pid`**. If you still see a tight loop, check logs **above** that line for **Node/nginx crash** (bad env, DB connect, nginx config).

## Operational caveats

- **Single instance** runs API, worker, and storefront together; deploys and crashes affect all three.
- **Changing** `NEXT_PUBLIC_*` requires a **new build**, not only a runtime env edit.
- Local verification: build with the same `--build-arg` values as App Platform, then `docker run -p 8080:8080 -e PORT=8080 ...` passing all runtime secrets (`DB_*`, `COOKIE_SECRET`, etc.). Docker Desktop must be running on your machine.
