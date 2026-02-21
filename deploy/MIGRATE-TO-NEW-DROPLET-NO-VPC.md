# Migrate to a new Droplet (no VPC)

Move everything from your current Droplet (in VPC, no outbound) to a **new Droplet with no VPC** so outbound internet works (Stripe, etc.). The **managed database stays as-is**; you only move the app server.

---

## Overview

| Step | Where | What |
|------|--------|-----|
| 1 | DigitalOcean | Create new Droplet, **no VPC**, same region (TOR1), same SSH key |
| 2 | PC | Copy project to new Droplet (or clone from git) |
| 3 | Old Droplet | Get `.env` and `jwt_key.pem` contents (console) |
| 4 | New Droplet | Create `.env`, `jwt_key.pem`, install Docker, deploy |
| 5 | DigitalOcean | Add new Droplet IP to managed DB **Trusted Sources** |
| 6 | New Droplet | Start stack, test Stripe and storefront |
| 7 | Optional | Use a Reserved IP so the IP doesn’t change later |

---

## Step 1: Create the new Droplet

1. In DigitalOcean: **Create** → **Droplets**.
2. **Region:** Same as now (e.g. **Toronto / TOR1**).
3. **Image:** Ubuntu 24.04 (LTS).
4. **Size:** Same or similar (e.g. 2 vCPU / 4 GB).
5. **Authentication:** Your SSH key (e.g. hungerhankerings).
6. **Hostname:** e.g. `hungerhankerings-app` or `ubuntu-s-2vcpu-4gb-amd-tor1-02`.
7. **Important – Networking:**  
   - If you see **VPC** or **Network**: choose **“No VPC”** or **“Default”** / leave default so the Droplet is **not** in a VPC.  
   - Avoid selecting the `default-tor1` VPC.
8. Create the Droplet and note the **new public IP** (e.g. `NEW_IP`).

---

## Step 2: Copy the project to the new Droplet (from your PC)

Same process as when you set up the original droplet: use SCP from your PC.

From your PC (PowerShell), with the new Droplet IP (replace `NEW_IP` and the key path):

1. Create the project directory on the new Droplet (one-time):
   ```powershell
   ssh -i "C:\Users\Roger\HungerHankerings\hungerhankerings" root@NEW_IP "mkdir -p /root/HungerHankerings"
   ```
   When asked "continue connecting?" type **yes**. When asked for passphrase, enter your key passphrase.

2. Copy the project into it:
   ```powershell
   cd C:\Users\Roger\HungerHankerings
   scp -i "C:\Users\Roger\HungerHankerings\hungerhankerings" ./docker-compose.yml ./docker-compose.prod.yml root@NEW_IP:/root/HungerHankerings/
   scp -i "C:\Users\Roger\HungerHankerings\hungerhankerings" -r ./storefront ./deploy root@NEW_IP:/root/HungerHankerings/
   ```

(If you have a custom `saleor` or other app directory, copy that into `/root/HungerHankerings/` as well.)

**If SCP hangs** after you enter your passphrase (e.g. your network blocks or drops SSH): try from another network (e.g. phone hotspot). If it still fails, see the fallback at the end of `deploy/MIGRATE-NEW-DROPLET-COMMANDS.txt`.

---

## Step 3: Get `.env` and `jwt_key.pem` from the old Droplet

You can’t SCP *from* the old Droplet (no outbound). Use the **DigitalOcean web console** for the **old** Droplet:

1. Open the old Droplet in DO → **Access** → **Launch Droplet Console**.
2. Run:
   ```bash
   cd /root/HungerHankerings
   cat .env
   ```
   Copy the full output (all lines).
3. Run:
   ```bash
   cat jwt_key.pem
   ```
   Copy the full output (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`).

Keep these in a temporary file or notepad; you’ll paste them on the new Droplet.

---

## Step 4: Set up the new Droplet

SSH into the **new** Droplet (from your PC):

```powershell
ssh -i "C:\Users\Roger\HungerHankerings\hungerhankerings" root@NEW_IP
```

Then run the following on the **new** Droplet.

**4a. Create project dir (if you used SCP and didn’t create it):**

```bash
mkdir -p /root/HungerHankerings
cd /root/HungerHankerings
```

(If you already have files there from SCP, just `cd /root/HungerHankerings`.)

**4b. Create `.env`:**

```bash
nano .env
```

Paste the contents you copied from the old Droplet. Then:

- Replace the **old** Droplet IP with the **new** one everywhere (e.g. `142.93.146.26` → `NEW_IP`), including:
  - `ALLOWED_HOSTS`
  - `ALLOWED_CLIENT_HOSTS`
  - Any `PUBLIC_API_URL` or similar
- Add or set the **public API URL** for Stripe (use the **new** Droplet IP):
  ```bash
  PUBLIC_URL=http://NEW_IP:8000
  ```
- Save and exit: **Ctrl+O**, Enter, **Ctrl+X**.

**4c. Create `jwt_key.pem`:**

```bash
nano jwt_key.pem
```

Paste the key you copied from the old Droplet (full block from `-----BEGIN` to `-----END`). Save and exit, then:

```bash
chmod 600 jwt_key.pem
```

**4d. Install Docker:**

```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
docker --version
docker compose version
```

**4e. Add the managed database to Trusted Sources (DigitalOcean):**

1. In DO: **Databases** → your Postgres cluster → **Settings** or **Trusted Sources**.
2. Add the **new Droplet’s public IP** so the new server can connect.

**4f. Start the stack:**

```bash
cd /root/HungerHankerings
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml up -d
```

**4g. Check containers:**

```bash
docker ps
```

You should see saleor-api, saleor-worker, saleor-dashboard, storefront, redis, mailpit.

---

## Step 5: Verify and configure Stripe

1. **Outbound test** on the new Droplet:
   ```bash
   curl -v --connect-timeout 10 https://api.stripe.com
   ```
   You should get a response (not timeout).

2. **Dashboard:** Open `http://NEW_IP:9000` and log in.

3. **Stripe plugin:** Configuration → Plugins → Stripe. Enter your test keys, set Supported currencies (e.g. CAD), save. It should save without “Internal Server Error” and the webhook endpoint may fill in.

4. **Storefront:** Open `http://NEW_IP:3000`. If the storefront was built with the old IP, rebuild or set `NEXT_PUBLIC_SALEOR_API_URL=http://NEW_IP:8000/graphql/` and rebuild so the storefront talks to the new API.

---

## Step 6: Use the new IP everywhere

- Bookmarks: use `http://NEW_IP:9000` (dashboard) and `http://NEW_IP:3000` (storefront).
- If you have a domain, point DNS A records to **NEW_IP** when you’re ready to switch.

---

## Optional: Reserved IP

To keep the same IP even if you replace the Droplet again:

1. In DO: **Networking** → **Reserved IPs** → **Reserve IP** (choose same region).
2. Assign the reserved IP to the **new** Droplet.
3. Use that reserved IP in `.env` (PUBLIC_URL, ALLOWED_HOSTS, etc.) and in DNS. Then you can later create another Droplet and assign the same reserved IP to it without changing config or DNS.

---

## Summary

| Item | Action |
|------|--------|
| New Droplet | Create with **no VPC**, same region, same SSH key |
| Project files | SCP from PC to new Droplet (or git clone) |
| `.env` | Copy from old Droplet via console; set NEW_IP and PUBLIC_URL |
| `jwt_key.pem` | Copy from old Droplet via console; chmod 600 |
| Managed DB | Add new Droplet IP to Trusted Sources |
| Stripe | After migration, save plugin again; outbound will work |

When everything works on the new Droplet, you can power off or destroy the old one.

### "Cannot add lines for unavailable for purchase variants" (Add to Cart)

This usually means the **channel** used in the browser doesn’t match the channel where the product is sold. The storefront uses a channel value that is **baked into the client bundle at build time** (`NEXT_PUBLIC_SALEOR_CHANNEL`). If that wasn’t set when you built the image, the client uses `default-channel` while your products are in e.g. `canada-international`.

- Ensure `.env` has `SALEOR_CHANNEL=canada-international` (or your channel slug).
- The compose build now passes `NEXT_PUBLIC_SALEOR_CHANNEL` from `SALEOR_CHANNEL`. **Rebuild the storefront** so the client bundle gets the correct channel:
  - `docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache storefront`
  - `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
- Then try Add to Cart again.
