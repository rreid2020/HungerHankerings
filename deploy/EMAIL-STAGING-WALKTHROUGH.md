# Step-by-step: email on your staging droplet (Resend + Vendure)

This guide assumes:

- You have a **DigitalOcean droplet** with Hunger Hankerings running in **Docker** (same compose files as production).
- Your **real website domain** stays on the live site—you will **not** add DNS in Resend for that domain while smoke testing.

---

## Smoke test (Resend test sender — use this now)

**No domain setup in Resend.** You only need an API key.

1. Set **`SMTP_FROM`** to Resend’s test sender (exactly):

   ```text
   Hunger Hankerings <onboarding@resend.dev>
   ```

2. In **Part E** below, use the same line in `.env` as:

   `SMTP_FROM=Hunger Hankerings <onboarding@resend.dev>`

3. **Limitation:** Resend only allows this sender for **limited testing**. Mail may only reach **your Resend account email** (the address you log into Resend with)—not arbitrary Gmail addresses. **Resend → Logs** should still show sends when SMTP is working.

4. When you need mail to **any** address, switch to **Path 2** at the bottom of this file (verify a **subdomain** and change `SMTP_FROM`).

**Skip Part C** if you’re following this block—you’re already using the test sender. Do **Part B**, then **Part E**, **Part F**, **Part G**.

---

## Part B — Resend account and API key

1. Go to [https://resend.com](https://resend.com) and sign up / log in.
2. Open **API Keys** (or **Settings → API Keys**).
3. Click **Create API Key**, name it (e.g. `staging-droplet`), copy the key once it appears. It starts with `re_`.
4. **Save it in a password manager or notepad**—Resend may not show the full key again.

You will paste this into `SMTP_PASS` on the server (later).

---

## Part C — (Optional) Same as smoke test above

If you already set `SMTP_FROM=Hunger Hankerings <onboarding@resend.dev>` per **Smoke test** at the top, skip this section.

---

## Part D — Path 2: verify a **subdomain** in Resend (when smoke test isn’t enough)

Example subdomain: `send.staging.hungerhankerings.com` (replace with your real domain and a name you like).

1. In Resend, go to **Domains** → **Add domain**.
2. Enter **only the subdomain**, e.g. `send.staging.hungerhankerings.com` (not `hungerhankerings.com` if you want to avoid touching apex mail).
3. Resend shows **DNS records** (often CNAME for DKIM, maybe TXT for SPF on that subdomain).
4. Log in to **where your DNS is hosted** (DigitalOcean Networking, Cloudflare, registrar, etc.).
5. Add **exactly** the records Resend lists (host/name, type, value). For a subdomain, the “name” is often something like `send.staging` or a long `resend._domainkey...`—copy from Resend; don’t guess.
6. Wait for Resend to show **Verified** (can take a few minutes to hours).
7. On the droplet, set **From** to an address **on that subdomain**, for example:

   `SMTP_FROM=Hunger Hankerings <noreply@send.staging.hungerhankerings.com>`

   (Use your verified subdomain and a local part you choose: `noreply`, `orders`, etc.)

8. Complete **Part E** and **Part F**.

---

## Part E — Edit `.env` on the droplet

1. SSH into the droplet:

   `ssh root@YOUR_DROPLET_IP`

2. Go to the project folder (adjust if yours differs):

   `cd /root/HungerHankerings`

3. Open the env file:

   `nano .env`

4. Find or add these lines (no quotes around values unless your password has spaces—avoid spaces in keys):

   ```bash
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=re_paste_your_full_api_key_here
   SMTP_SECURE=true
   SMTP_FROM=Hunger Hankerings <onboarding@resend.dev>
   ```

   - For **Path 2**, replace `SMTP_FROM` with your line from Part D step 7.
   - **`SMTP_USER` must be the word `resend`** (not your email).
   - **`SMTP_PASS` must be the full `re_...` key.**

5. **Save and exit nano:** `Ctrl+O`, Enter, then `Ctrl+X`.

6. Confirm your **site URLs** in the same file make sense for how you open the site (IP or staging host), for example:

   ```bash
   APP_URL=http://YOUR_DROPLET_IP
   NEXT_PUBLIC_SITE_URL=http://YOUR_DROPLET_IP
   NEXT_PUBLIC_VENDURE_SHOP_API_URL=http://YOUR_DROPLET_IP/shop-api
   ```

   Use `https` and your real staging hostname if you have TLS and a name pointed at the droplet.

---

## Part F — Restart Vendure so it loads mail settings

Email jobs run through the **worker**. Both **vendure** and **vendure-worker** must be recreated after `.env` changes.

Run:

```bash
cd /root/HungerHankerings
export COMPOSE_PROJECT_NAME=hungerhankerings
set -a && . ./.env && set +a
comp='docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml'
$comp up -d --force-recreate vendure vendure-worker
```

Wait ~30–60 seconds, then check:

```bash
$comp logs vendure 2>&1 | grep -i smtp | tail -5
$comp logs vendure-worker 2>&1 | grep -i smtp | tail -5
```

You want to see **SMTP enabled** with **`user=resend`**, not **no auth**.

---

## Part G — Quick “is it working?” checks

1. **Containers**

   ```bash
   $comp ps -a
   ```

   `vendure` and `vendure-worker` should be **Up**.

2. **Env inside containers** (does not print your password):

   ```bash
   $comp exec -T vendure sh -c 'echo SMTP_HOST=$SMTP_HOST SMTP_USER=$SMTP_USER'
   $comp exec -T vendure-worker sh -c 'echo SMTP_HOST=$SMTP_HOST SMTP_USER=$SMTP_USER'
   ```

   Both should show `SMTP_USER=resend` and `SMTP_HOST=smtp.resend.com`.

3. **Send a test**  
   On your staging storefront: **Forgot password** / **Register** with an email address that is allowed for your Path (Path 1: often your Resend account email; Path 2: any address).

4. **Resend dashboard → Logs**  
   After the test, you should see activity. If **still empty**, re-read Part E: **`SMTP_USER` and `SMTP_PASS` must both be set.**

---

## Part H — What this does **not** do

- It does **not** move your live website.
- It does **not** change live email **unless** you add DNS on the **same hostname** live mail uses without merging records (Path 2 uses a **subdomain** to avoid that).
- The **storefront** does not send order mail; **Vendure** does—so all `SMTP_*` variables matter on **Vendure containers**, not on Next.js for order confirmation email.

---

## If you’re still stuck

Copy the output of (remove secrets before sharing publicly):

```bash
$comp ps -a
$comp exec -T vendure sh -c 'echo SMTP_HOST=$SMTP_HOST SMTP_USER=$SMTP_USER SMTP_PORT=$SMTP_PORT'
$comp logs vendure-worker --tail=80
```

and check **Resend → Logs** for the same minute you clicked “reset password.”

---

## Related files in this repo

- [`env.production.example`](./env.production.example) — full list of variables  
- [`STAGING-DROPLET.md`](./STAGING-DROPLET.md) — staging overview and troubleshooting  
- [`../storefront/docs/RESEND-SMTP.md`](../storefront/docs/RESEND-SMTP.md) — Resend + worker notes  
