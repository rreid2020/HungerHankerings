# DigitalOcean App Platform (single Web Service)

This repo includes a **one-container** production layout: **Vendure** (`127.0.0.1:3000`), **Vendure worker**, **Next.js** (`127.0.0.1:3001`), and **nginx** on **`$PORT`** (App Platform sets this; default **8080**). Optional **`INTERNAL_OPS_HOST`** adds a second nginx `server_name` so a staff subdomain (e.g. `ops.example.com`) hits the **same** Next.js process — use `Host` in the app to serve a custom admin portal.

Files:

| Path | Purpose |
|------|---------|
| `Dockerfile` (repo root) | Multi-stage build + runtime image (root path so App Platform prefers Docker over Node buildpack) |
| `deploy/app-platform/nginx-main.conf` | `http { … limit_* zones … }` |
| `deploy/app-platform/nginx-app.conf.template` | Server block → `default.conf` at startup |
| `deploy/app-platform/nginx-ops-host.conf.template` | Optional second `server_name` for staff subdomain → Next (appended when `INTERNAL_OPS_HOST` is set) |
| `deploy/app-platform/supervisord.conf` | Starts vendure, worker, storefront, nginx |
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

**Private hostname (`private-db-postgresql-…`) vs public (`db-postgresql-…`):** the private host resolves to a **VPC-only IP** (e.g. `10.118.x.x`). Runtime logs like **`connect ETIMEDOUT 10.x.x.x:25060`** mean the container opened a socket toward that address but **no route answered** — almost always because **App Platform is not attached to the same VPC** as the database. **Trusted sources** only control who may connect once traffic reaches Postgres; they do not route your app into the VPC.

**Fix (pick one):**

1. **Stay on private networking:** [Enable VPC networking for the App Platform app](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/) and join the **same VPC** (and compatible region/datacenter) as the managed database. Then keep **`DB_HOST`** on the **`private-db-…`** hostname. See also [Manage databases in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/).

2. **Stay on App Platform without VPC attachment:** Switch **`DB_HOST`** back to the **public** hostname (`db-postgresql-…ondigitalocean.com`, not `private-db-postgresql-…`) and rely on TLS + trusted sources (or a **dedicated egress IP**). Your Droplet in the VPC can keep using the private host if you split environments later.

**Constraint:** DigitalOcean documents that **VPC networking and dedicated egress IP cannot both be enabled** on the same app — plan accordingly.

### Same VPC but logs still show `ETIMEDOUT` to `10.x.x.x:25060`

DigitalOcean ties App Platform to **one datacenter per region** (not “any VPC in the account”). Example: an app in region **`tor`** can attach only to VPCs in **`tor1`**. Your managed Postgres cluster must live in that **same datacenter** VPC, or you need **[VPC peering](https://docs.digitalocean.com/products/networking/vpc/how-to/create-peering/)** between the app’s VPC and the database’s VPC. See the region → datacenter table in [Enable App Platform VPC](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/).

If the database uses **trusted sources**, the VPC doc also requires adding the **app’s VPC egress private IP** to the database’s trusted sources (not only “App Platform” in the abstract). In the control panel: **Databases → your cluster → Settings / Network Access → Trusted sources** — confirm the App’s **private egress** address (from the app’s **Networking** tab after VPC is enabled) is listed. Missing or stale IPs after a redeploy can produce **timeouts**, not immediate “connection refused” from Postgres.

After changing VPC or trusted sources, **redeploy the app** so workers pick up routing; then confirm runtime logs show Vendure connecting without repeating `ETIMEDOUT`.

### Spaces

Set all four: `DO_SPACES_BUCKET`, `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION` — same as Droplet (see `vendure-config.ts`).

### Stripe webhooks

Point webhook URLs at your **new** public hostname (`https://…/payments/…` as configured for Vendure).

### Staff subdomain (`ops`) — custom admin on Next.js

When **`INTERNAL_OPS_HOST`** is set (e.g. `ops.hungerhankerings.com`), nginx appends a vhost that proxies that hostname to **Next.js on `127.0.0.1:3001`** (same app as the storefront). Add the **ops** domain on the App and DNS.

**Ops portal in Next.js:** set **`INTERNAL_OPS_HOST`** (runtime, nginx) and the **same hostname** as **`NEXT_PUBLIC_OPS_HOST`** at **Docker build** time (`Dockerfile` `ARG`) or App Platform **BUILD_TIME** env so middleware can redirect `/` → `/ops`. At runtime, `INTERNAL_OPS_HOST` / `OPS_HOST` alone is enough for the **layout** branch; without `NEXT_PUBLIC_OPS_HOST` in the bundle, the `/` redirect on the ops host may not run until you rebuild with the build-arg.

Routes: **`/ops`** (dashboard), **`/ops/leads`** (stub). **`/ops`** on the public storefront hostname is redirected to `/`. Remove any old Directus-only env if present.

#### Staff portal over the internet (production — not localhost)

Traffic is **HTTPS from the browser → App Platform → nginx on `$PORT` (8080) → Next on 127.0.0.1:3001**. Staff should **never** open `localhost:3001` or an internal port; those addresses exist only **inside** the container.

For paths proxied to **Next.js on `127.0.0.1:3001`**, nginx forwards the **browser’s scheme** as **`X-Forwarded-Proto`** / **`X-Forwarded-Client-Proto`** (usually **`https`** via **`$pass_forwarded_proto`**). The storefront prefers **`x-forwarded-client-proto`** when building origins and **Secure** cookies. Production Next enables **`experimental.trustHostHeader`** so absolute URLs use **`https://{Host}{path}`** instead of **`https://127.0.0.1:3001/…`** — but **`next start -H 127.0.0.1`** prevents that (Next pins **`fetchHostname`** and **`trustHostHeader` is ignored** for **`initURL`**). **`supervisord`** therefore starts **`next start -p 3001`** without **`-H`** (default bind inside the container only; nginx still proxies **`127.0.0.1:3001`**). **`X-Forwarded-Host`** is set from **`$host`** so the load balancer cannot overwrite it with the apex domain.

1. **App Platform → your app → Settings → Domains** — Add **`ops.<your-domain>`** (and keep your apex/www domains for the storefront). DigitalOcean terminates TLS and forwards requests into the container; nginx preserves **`X-Forwarded-Proto`** / **`X-Forwarded-Client-Proto`** as **`https`** for the browser connection.
2. **DNS** — At your DNS host, create a **CNAME** for **`ops`** pointing at the hostname DigitalOcean shows for the app (often **`your-app-xxxxx.ondigitalocean.app`** or similar).
3. **Runtime env** — **`INTERNAL_OPS_HOST=ops.<your-domain>`** (exact FQDN, no `https://`).
4. **Build-time env** — **`NEXT_PUBLIC_OPS_HOST`** set to the **same** FQDN, then trigger a **new deploy** so the Next.js bundle includes it (middleware host detection).
5. **Clerk** — Use **production** keys (`pk_live_` / `sk_live_`) on the live app when ready. In the Clerk dashboard, allow **`https://ops.<your-domain>`** (and paths if prompted) for redirects / authorized frontends. Staff bookmark: **`https://ops.<your-domain>/`** (redirects to **`/ops`**) or **`https://ops.<your-domain>/ops/sign-in`**.
6. **Secrets** — **`CLERK_SECRET_KEY`** = runtime **SECRET**; **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** = **BUILD_TIME** (embedded in the client bundle — not confidential, but required at build).

#### Diagnosis (why this looked like “going in circles”)

Several **independent** layers had to line up; fixing only one left the others broken.

| Layer | What went wrong | What fixes it |
|--------|------------------|----------------|
| **Next.js `initURL`** | `resolveRoutes()` sets `initURL`, then **`attachRequestMeta()` overwrites it**. If `next start` uses **`-H 127.0.0.1`**, Next sets **`fetchHostname`** and uses **`https://127.0.0.1:3001`…** whenever **`x-forwarded-proto`** contains `https` — TLS to a **plain HTTP** listener (**EPROTO**) or inconsistent URLs for RSC/Clerk. | **`experimental.trustHostHeader`** in production **and** **`next start -p 3001` without `-H`** so the trusted **`Host`** branch wins. |
| **Forwarded protocol** | Clerk (and Next) treat **`x-forwarded-proto`** as the browser scheme. Forcing it to **`http`** on the nginx→Next hop produced **`http://`** redirect URLs and wrong JWT **`azp`**. | Forward **`X-Forwarded-Proto`** / **`X-Forwarded-Client-Proto`** as **`$pass_forwarded_proto`** (HTTPS at the edge). |
| **Ops vs storefront host** | Middleware used **`x-forwarded-host` first** only; the root layout used **`Host OR forwarded`**. A misleading forwarded host sent ops traffic down the **storefront** middleware path. | **`isOpsRequestHeaders()`** in middleware; **`X-Forwarded-Host: $host`** on Next upstreams. |
| **Content-Security-Policy** | nginx sent a **global** CSP (`connect-src 'self'`, tight **`frame-src`**). The browser applies **each** CSP separately; Clerk must **`fetch`** and **`iframe`** the **Frontend API** host (e.g. **`https://clerk.ops…`**). That violated nginx’s policy → handshake / frame errors and unstable auth. **This is not fixed by changing headers alone if CSP still blocks Clerk.** | **Do not** attach a blanket CSP from nginx for Next. **`clerkMiddleware(..., { contentSecurityPolicy: {} })`** on the ops host (see Clerk docs). Re-introduce CSP for the **storefront** via **`next.config.js`** or nginx **per-location** if you need parity with the old policy. |
| **Clerk handshake → HTTP 500** | `@clerk/nextjs` **`runHandlerWithRequestState`** throws **`Clerk: handshake status without redirect`** when **`authenticateRequest`** returns **`Handshake`** but **no `Location`** header — common if **`signInUrl` / app URL** are wrong behind a proxy or when the browser cannot complete cross-domain cookie flows to **`clerk.*`**. | **`frontendApiProxy: { enabled: true }`** (same-origin FAPI via middleware) + absolute **`signInUrl`** (`NEXT_PUBLIC_CLERK_SIGN_IN_URL` or derived `https://ops…/ops/sign-in`). If using Clerk **satellite** domains, set **`NEXT_PUBLIC_CLERK_IS_SATELLITE`** / **`NEXT_PUBLIC_CLERK_DOMAIN`** per Clerk dashboard. |

Local development remains optional: run **`pnpm dev`** from the repo (storefront defaults to port **3003**); set **`NEXT_PUBLIC_OPS_HOST=localhost`** in **`storefront/.env.local`** if you need the ops layout and **`/ops`** routes locally. That path does **not** replace internet access for real staff workflows.

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

### `GET /ops` returns **500** (Runtime logs: `Clerk: handshake status without redirect`)

That string is thrown **inside `clerkMiddleware`** before your page runs — it is not a Next.js route bug. Apply **`frontendApiProxy`** + absolute **`signInUrl`** (this repo’s middleware does both); rebuild/redeploy. Set **`NEXT_PUBLIC_CLERK_SIGN_IN_URL`** explicitly if needed (include **`https://`** and path **`/ops/sign-in`**). For Clerk **satellite** setups, configure **`NEXT_PUBLIC_CLERK_DOMAIN`** / **`NEXT_PUBLIC_CLERK_IS_SATELLITE`** as in the Clerk dashboard. Clear site cookies for **`ops…`** and **`clerk…`** after changing Clerk URLs.

### Shop page shows no product cards (empty grid)

Server-side Next calls Vendure at **`VENDURE_SHOP_API_URL`** (default `http://localhost:3000/shop-api`). Inside this Docker image, set **`VENDURE_SHOP_API_URL=http://127.0.0.1:3000/shop-api`** so SSR always hits the local Vendure process.

If Vendure logs still show DB errors after fixing **`DB_HOST`** (hostname only, not a full `postgres://…` URL):

1. Set **`DB_SSL_REJECT_UNAUTHORIZED=false`** for DigitalOcean managed Postgres (TLS with a CA Node does not trust by default). Without it, TypeORM often fails to connect even when the host resolves.
2. Confirm **`DB_PORT`** (e.g. `25060`), **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** match the cluster; rotate the password if it was exposed in logs.
3. **Trusted sources** only fix networking; they do not populate data. A **new** `vendure` database is empty until you restore a dump or run migrations + Admin setup. The storefront also **hides products whose variants have no list price** in the active channel—assign **CAD** (or your channel currency) prices in Admin if the grid is empty but products exist.

To verify Vendure quickly: runtime logs should show **`Bootstrapping Vendure Server`** without repeating **`Unable to connect to the database`**; **`/admin`** should load when the server is healthy.

### `Unlinking stale socket /run/supervisor.sock` (repeating)

Supervisord was restarting quickly and fighting a leftover RPC socket. The image **disables the RPC socket** (no `unix_http_server`) and uses **`/tmp/supervisord.pid`**. If you still see a tight loop, check logs **above** that line for **Node/nginx crash** (bad env, DB connect, nginx config).

## Operational caveats

- **Single instance** runs API, worker, and storefront together; deploys and crashes affect all three.
- **Changing** `NEXT_PUBLIC_*` requires a **new build**, not only a runtime env edit.
- Local verification: build with the same `--build-arg` values as App Platform, then `docker run -p 8080:8080 -e PORT=8080 ...` passing all runtime secrets (`DB_*`, `COOKIE_SECRET`, etc.). Docker Desktop must be running on your machine.
