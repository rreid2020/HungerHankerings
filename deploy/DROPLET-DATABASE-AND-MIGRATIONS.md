# Database setup and migrations on the Droplet

Use this guide after you have:
- A DigitalOcean Droplet with the Hunger Hankerings project at `/root/HungerHankerings`
- A DigitalOcean managed Postgres cluster
- A database named **Saleor** (or **saleor**) on that cluster
- `.env` on the Droplet with `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `ALLOWED_CLIENT_HOSTS`, `DEBUG=0`, and `RSA_PRIVATE_KEY` (see Step 2)

---

## Where you run commands

- **Your PC (PowerShell):** Only for uploading files (e.g. `scp`).
- **Droplet (DO Web Console or SSH):** All setup, `.env`, Docker, and migrations.

---

## Step 1: Point `.env` at the Saleor database (Droplet)

**Where:** DigitalOcean Droplet (Web Console or SSH).

**What:** Make sure `DATABASE_URL` in `.env` uses your **Saleor** database, not `defaultdb`.

1. Open `.env` on the Droplet:
   ```bash
   cd /root/HungerHankerings
   nano .env
   ```

2. Find the line that starts with `DATABASE_URL=`.

3. Change the database name in the URL from `defaultdb` to `saleor` (lowercase).  
   If you created the database in PGAdmin with a capital S (**Saleor**), try `Saleor` if `saleor` fails.

   Example (replace `YOUR_PASSWORD` with your real DB password):
   ```bash
   DATABASE_URL=postgres://doadmin:YOUR_PASSWORD@db-postgresql-tor1-60715-do-user-20752759-0.e.db.ondigitalocean.com:25060/saleor?sslmode=require
   ```

4. Save and exit: **Ctrl+O**, Enter, then **Ctrl+X**.

---

## Step 2: Generate JWT RSA key (required when DEBUG=0)

**Where:** Droplet.

**What:** Saleor needs an RSA private key for JWT when `DEBUG=False`. Keep it as a **file** (do not put it in `.env`—multi-line values get corrupted there).

1. Go to the project directory:
   ```bash
   cd /root/HungerHankerings
   ```

2. Generate a 2048-bit RSA key (no passphrase) and keep it as `jwt_key.pem`:
   ```bash
   openssl genrsa -out jwt_key.pem 2048
   ```

3. **(If you previously added `RSA_PRIVATE_KEY` to `.env`)** Remove that line so it doesn’t override the key you pass later:
   ```bash
   sed -i '/^RSA_PRIVATE_KEY=/d' .env
   ```

4. Restrict access to the key file:
   ```bash
   chmod 600 jwt_key.pem
   ```

You will use `jwt_key.pem` when running migrate (Step 4) and when starting the stack (Step 6).

---

## Step 3: Install Docker on the Droplet (if not already installed)

**Where:** Droplet.

**What:** Install Docker and Docker Compose so you can run Saleor and migrations.

```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
```

Check that Docker runs:
```bash
docker --version
docker compose version
```

---

## Step 4: Run Saleor migrations (create tables in the Saleor database)

**Where:** Droplet.

**What:** Run Django migrations so Saleor creates its tables in your **Saleor** database. This does **not** start the full stack; it runs a one-off migration container.

1. Go to the project directory:
   ```bash
   cd /root/HungerHankerings
   ```

2. Run migrations (pass the JWT key from the file so newlines are preserved):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py migrate
   ```

   - If you see `python3: command not found` or similar, try:
     ```bash
     docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python manage.py migrate
     ```

3. Wait until it finishes. You should see output like “Applying … OK” for each migration.

4. In PGAdmin, refresh the **Saleor** database → **Schemas** → **public** → **Tables**. You should see many new Saleor tables.

**If migration `discount.0052_drop_sales_constraints` fails** with `column "id" is in a primary key` (PostgreSQL 18):

1. Run the fix SQL against the Saleor database (from the Droplet, using the same `DATABASE_URL` as in `.env`). For example, with `psql` installed:
   ```bash
   cd /root/HungerHankerings
   apt-get install -y postgresql-client 2>/dev/null || true
   psql "$(grep DATABASE_URL .env | cut -d= -f2-)" -f deploy/fix-migration-0052-pg18.sql
   ```
   Or in **PGAdmin**: connect to the Saleor database, open Query Tool, paste the contents of `deploy/fix-migration-0052-pg18.sql`, and run it.

2. Mark the migration as applied without running it again:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py migrate discount 0052_drop_sales_constraints --fake
   ```

3. Continue with the rest of the migrations:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py migrate
   ```

---

## Step 5 (optional): Create a Saleor admin user

**Where:** Droplet.

**What:** Create a superuser so you can log in to the Saleor dashboard. Pass the JWT key from the file (same as migrate):

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py createsuperuser
```

Enter **email** and **password** when prompted. Use this to sign in to the dashboard later.

(If `python3` fails, use `python` instead.)

---

## Step 5b: Create JWT compose override for `docker compose up`

**Where:** Droplet.

**What:** For the long-running API and worker, the key must be in the container. Docker’s `.env` can’t hold multi-line PEM, so we use a compose override that injects the key from `jwt_key.pem`.

Run this once (it creates `docker-compose.jwt.yml` from `jwt_key.pem`):

```bash
cd /root/HungerHankerings
{ echo "services:";
  echo "  saleor-api:";
  echo "    environment:";
  echo "      RSA_PRIVATE_KEY: |";
  sed 's/^/        /' jwt_key.pem;
  echo "  saleor-worker:";
  echo "    environment:";
  echo "      RSA_PRIVATE_KEY: |";
  sed 's/^/        /' jwt_key.pem;
} > docker-compose.jwt.yml
```

Do **not** commit `docker-compose.jwt.yml` or `jwt_key.pem` (add them to `.gitignore` if you use git).

---

## Step 6: Start the full stack (after migrations)

**Where:** Droplet.

**What:** Build the storefront and start all services (API, worker, Redis, storefront, dashboard, etc.).

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml build --no-cache storefront
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d
```

Check that containers are running:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml ps
```

---

## Summary: order of commands on the Droplet

| Step | Where   | Command |
|------|--------|--------|
| 1    | Droplet | `cd /root/HungerHankerings` then `nano .env` → set `DATABASE_URL` to use database `saleor` (or `Saleor`) |
| 2    | Droplet | `cd /root/HungerHankerings` then `openssl genrsa -out jwt_key.pem 2048` and `chmod 600 jwt_key.pem` (remove any `RSA_PRIVATE_KEY` line from `.env` with `sed -i '/^RSA_PRIVATE_KEY=/d' .env`) |
| 3    | Droplet | `apt update && apt install -y docker.io docker-compose-v2 && systemctl enable --now docker` |
| 4    | Droplet | `cd /root/HungerHankerings` then `docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py migrate` |
| 5    | Droplet | (optional) `docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm -e RSA_PRIVATE_KEY="$(cat jwt_key.pem)" saleor-api python3 manage.py createsuperuser` |
| 5b   | Droplet | Create `docker-compose.jwt.yml` from `jwt_key.pem` (see Step 5b block above) |
| 6    | Droplet | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml build --no-cache storefront` then `... up -d` with same `-f` options |

All of these commands are run **on the Droplet** (Web Console or SSH), except any `scp` you use from your PC to upload `.env` or the project.
