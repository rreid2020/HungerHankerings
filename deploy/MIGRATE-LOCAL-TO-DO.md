# Migrate Saleor data: local → DigitalOcean

> **LEGACY – Saleor only.** This doc is for migrating **Saleor** data. For **Vendure**, use `DB_NAME=vendure` in `.env` and run migrations with `docker compose ... run --rm vendure node dist/migrate.js`. See `docs/troubleshoot-502.md` and `deploy/DROPLET-DATABASE-AND-MIGRATIONS.md`.

Copy **data** (products, orders, users, etc.) from your **local** Saleor Postgres into the **Saleor** database on DigitalOcean. Do the steps in order: PC first, then Droplet.

---

## Copy-paste command list (complete)

Replace `142.93.146.26` with your Droplet IP if different. For SSH key login, add `-i "C:\Users\Roger\.ssh\your_key"` after `scp` or `ssh`.

### PC (PowerShell) – run these in order

```powershell
cd C:\Users\Roger\HungerHankerings
```

```powershell
docker compose --profile local up -d postgres
```

```powershell
docker compose --profile local run --rm -e PGPASSWORD=saleor -v "${PWD}/deploy:/out" postgres pg_dump -h postgres -p 5432 -U saleor -d saleor -Fc --data-only -f /out/saleor_data.dump
```

```powershell
dir deploy\saleor_data.dump
```

```powershell
scp deploy/saleor_data.dump root@142.93.146.26:/root/HungerHankerings/deploy/
```

```powershell
scp deploy/restore-saleor-data-on-do.sh root@142.93.146.26:/root/HungerHankerings/deploy/
```

### Droplet (after SSH) – run these in order

```bash
ssh root@142.93.146.26
```

```bash
cd /root/HungerHankerings
```

```bash
chmod +x deploy/restore-saleor-data-on-do.sh
```

```bash
./deploy/restore-saleor-data-on-do.sh
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d --force-recreate saleor-api saleor-worker
```

Then open http://142.93.146.26:9000 and confirm your data is there.

---

## On your PC (PowerShell)

**Step 1 – Go to project folder**

```powershell
cd C:\Users\Roger\HungerHankerings
```

**Step 2 – Start local Postgres (if not already running)**

```powershell
docker compose --profile local up -d postgres
```

**Step 3 – Create the data dump**

Run **one** of these. Try the first; if it fails (e.g. “host.docker.internal” unknown), use the second.

```powershell
docker run --rm -e PGPASSWORD=saleor -v "${PWD}/deploy:/out" postgres:15 pg_dump -h host.docker.internal -p 55432 -U saleor -d saleor -Fc --data-only -f /out/saleor_data.dump
```

If that fails:

```powershell
docker compose --profile local run --rm -e PGPASSWORD=saleor -v "${PWD}/deploy:/out" postgres pg_dump -h postgres -p 5432 -U saleor -d saleor -Fc --data-only -f /out/saleor_data.dump
```

**Step 4 – Check the dump file exists**

```powershell
dir deploy\saleor_data.dump
```

You should see a file (size > 0). If not, fix Step 3 before continuing.

**Step 5 – Copy the dump to the Droplet**

Use your real Droplet IP. With **password** login:

```powershell
scp deploy/saleor_data.dump root@142.93.146.26:/root/HungerHankerings/deploy/
```

With **SSH key** (replace path to your key):

```powershell
scp -i "C:\Users\Roger\.ssh\your_private_key" deploy/saleor_data.dump root@142.93.146.26:/root/HungerHankerings/deploy/
```

**Step 6 – Copy the restore script to the Droplet** (if it’s not already there)

```powershell
scp deploy/restore-saleor-data-on-do.sh root@142.93.146.26:/root/HungerHankerings/deploy/
```

With key:

```powershell
scp -i "C:\Users\Roger\.ssh\your_private_key" deploy/restore-saleor-data-on-do.sh root@142.93.146.26:/root/HungerHankerings/deploy/
```

PC steps are done. Next: Droplet.

---

## On the Droplet (SSH then bash)

**Step 7 – SSH into the Droplet**

From your PC:

```bash
ssh root@142.93.146.26
```

Or with key:

```bash
ssh -i "C:\Users\Roger\.ssh\your_private_key" root@142.93.146.26
```

**Step 8 – Go to project directory**

```bash
cd /root/HungerHankerings
```

**Step 9 – Make the restore script executable**

```bash
chmod +x deploy/restore-saleor-data-on-do.sh
```

**Step 10 – Run the restore (truncate DO data, then load your dump)**

```bash
./deploy/restore-saleor-data-on-do.sh
```

This script uses `DATABASE_URL` from your `.env`, truncates all tables except `django_migrations`, then restores `deploy/saleor_data.dump`. You can ignore “role does not exist” messages from `pg_restore`.

**Step 11 – Restart Saleor so it uses the new data**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d --force-recreate saleor-api saleor-worker
```

**Step 12 – Confirm**

Open the dashboard (e.g. http://142.93.146.26:9000) and check that products, orders, or users from your local install are there.

---

## Quick reference

| Where   | What to do |
|--------|------------|
| **PC 1**  | `cd C:\Users\Roger\HungerHankerings` |
| **PC 2**  | `docker compose --profile local up -d postgres` |
| **PC 3**  | Run one `pg_dump` command (see Step 3 above) |
| **PC 4**  | `dir deploy\saleor_data.dump` |
| **PC 5**  | `scp deploy/saleor_data.dump root@142.93.146.26:/root/HungerHankerings/deploy/` |
| **PC 6**  | `scp deploy/restore-saleor-data-on-do.sh root@142.93.146.26:/root/HungerHankerings/deploy/` |
| **DO 7**  | `ssh root@142.93.146.26` |
| **DO 8**  | `cd /root/HungerHankerings` |
| **DO 9**  | `chmod +x deploy/restore-saleor-data-on-do.sh` |
| **DO 10** | `./deploy/restore-saleor-data-on-do.sh` |
| **DO 11** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d --force-recreate saleor-api saleor-worker` |
| **DO 12** | Check dashboard for your data |

---

## If the script isn’t on the Droplet yet

Ensure the project on the Droplet has the script. Either:

- Copy it from PC (Step 6 above), or  
- From the Droplet, create it:

```bash
cd /root/HungerHankerings
# Create deploy dir if needed
mkdir -p deploy
nano deploy/restore-saleor-data-on-do.sh
```

Paste in the contents of `deploy/restore-saleor-data-on-do.sh` from your PC, save (Ctrl+O, Enter, Ctrl+X), then:

```bash
chmod +x deploy/restore-saleor-data-on-do.sh
```

Then run Step 10 as above.
