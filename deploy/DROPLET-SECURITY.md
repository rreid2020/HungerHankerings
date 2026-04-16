# Droplet security checklist (after a compromise)

Use this on a **new** Droplet so it stays secure. The droplet that was hacked was likely left with weak or default access (e.g. password auth, too many ports open, no rate limiting). This checklist prevents that.

**If DigitalOcean emailed you about outbound DDoS (traffic from your Droplet toward a victim IP):** that almost always means the **server was compromised** (malware or a bot) and is **not** “your app legitimately doing that.” Changing passwords alone does not remove malware. Safe paths: **destroy the Droplet and rebuild** (Path 1 in DO’s email), or recover data from a [recovery ISO](https://docs.digitalocean.com/products/droplets/how-to/use-recovery-iso/) then destroy. On the **replacement** Droplet, use **new** secrets (`.env`, DB passwords, `jwt_key.pem`, Stripe/Resend keys if they ever lived on the old box), a **new** deploy SSH key if the old machine was rooted, and follow this doc **before** exposing the stack to the internet. See also [Droplets and DDoS incidents](https://docs.digitalocean.com/products/droplets/resources/ddos/).

**Critical:** Do the security steps **in order** and **right after** you create the droplet. Don’t clone the repo, start Docker, and leave the box running for days before locking it down—that’s when it gets found and compromised.

---

## Do this first (same day you create the droplet)

1. Create the Droplet (SSH key only, no password; no VPC).
2. SSH in and **immediately** run sections 1–5 below (SSH hardening, firewall, updates, Nginx/rate limiting, fail2ban). Keep a second terminal open so you don’t lock yourself out.
3. Then add the droplet to the managed DB trusted sources, clone the repo, add `.env` and `jwt_key.pem`, and start the stack.

**Don’t during setup:** Don’t expose Redis (6379), Postgres, or Mailpit to the internet. Don’t use the same passwords or `.env` as on the old droplet. Don’t skip the firewall or leave password auth on.

---

## 1. SSH: key-only, no passwords

**Disable password authentication** so only your SSH key can log in.

On the droplet (after first login):

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload sshd
```

- `PermitRootLogin prohibit-password`: root can log in only with a key, not a password.
- **Test from a second terminal** (keep the first one open): `ssh -i /path/to/hungerhankerings root@DROPLET_IP`. If that works, you’re good. Then you can close the first session.

**Optional but recommended:** Create a non-root user, add your SSH key to it, use `sudo` for admin, and then set `PermitRootLogin no`. That way no one logs in as root at all.

---

## 2. Firewall: only needed ports

Allow only what the world needs; block everything else.

**If you access the app by IP and port** (e.g. `http://IP:3001` for storefront when not using Nginx):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Storefront (when not behind Nginx)
sudo ufw allow 3000/tcp  # Vendure (only if not behind Nginx)
sudo ufw --force enable
sudo ufw status
```

**Better long-term:** Expose only SSH and HTTP/HTTPS, and put Nginx in front (reverse proxy to storefront and Vendure). Then:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Don’t open 6379 (Redis), 8025 (Mailpit), or any other internal port to the internet.

---

## 3. Automatic security updates

Install and enable unattended security updates:

```bash
sudo apt-get update
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Optionally enable automatic reboot for kernel updates (only if you’re okay with short, occasional reboots):

```bash
echo 'Unattended-Upgrade::Automatic-Reboot "true";' | sudo tee /etc/apt/apt.conf.d/50unattended-upgrades-reboot
```

---

## 4. Rate limiting (Nginx reverse proxy)

Put Nginx in front of the app so all HTTP traffic is rate-limited by client IP. This reduces abuse and DDoS-style floods.

- **Use the project’s Nginx setup:** `nginx/nginx.conf` and `docker-compose.nginx.yml`.
- Run the stack with Nginx:  
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml -f docker-compose.nginx.yml up -d`
- Then **only ports 22 and 80** need to be open; no need to expose 3000, 8000, 9000.

Limits (per IP): GraphQL 10 req/s (burst 20), storefront 30 req/s (burst 50), and a connection cap. See `nginx/README.md` for details and required `.env` values (e.g. `APP_URL` / `NEXT_PUBLIC_VENDURE_SHOP_API_URL` on the same host).

---

## 5. Fail2ban: slow down SSH brute force

Fail2ban blocks an IP after too many failed SSH attempts.

```bash
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Default jail for SSH is usually enabled. Check:

```bash
sudo fail2ban-client status sshd
```

---

## 6. Secrets and app config

- **Never** commit `.env`, `jwt_key.pem`, or `docker-compose.jwt.yml` to Git (they’re in `.gitignore`).
- On the droplet, restrict permissions:  
  `chmod 600 /root/HungerHankerings/.env /root/HungerHankerings/jwt_key.pem`
- Use a strong `SECRET_KEY` and database password; rotate them if the previous droplet was compromised.
- In `.env`, set `DEBUG=0` in production.

---

## 7. Docker and containers

- The app runs in containers; the host only needs Docker and Compose.
- Don’t run random images or one-off `docker run` from the internet; use only your own Dockerfile and known base images (e.g. official Node, Postgres).
- Keep images updated: re-pull and rebuild after `git pull` (your deploy workflow already does a build).

---

## 8. What not to do

- Don’t use the same SSH key, passwords, or `.env` as on the compromised droplet. Generate new secrets for the new server.
- Don’t open Redis (6379), Postgres, or other internal ports to 0.0.0.0 on the host.
- Don’t run as root inside containers if you can avoid it (Saleor/Next images may already use non-root users).
- Don’t skip the firewall; default-deny and explicit allow is the baseline.

---

## 9. Order of operations on a new Droplet

1. Create droplet (no VPC, SSH key, Ubuntu 24.04).
2. SSH in and **immediately** do: SSH hardening (section 1), firewall (section 2), unattended-upgrades (section 3), rate limiting via Nginx (section 4), fail2ban (section 5).
3. Add droplet IP to managed DB trusted sources.
4. Clone repo, add `.env` and `jwt_key.pem`, generate `docker-compose.jwt.yml`, then start the stack (include `-f docker-compose.nginx.yml` for rate limiting).
5. Test storefront and API; then destroy the old compromised droplet.

Keeping SSH key-only, a tight firewall, rate limiting (Nginx), automatic updates, and fail2ban gives you a much stronger baseline than an unhardened box.

---

## 10. Optional: DigitalOcean Cloud Firewall

In the DO control panel you can attach a **Cloud Firewall** to the Droplet (inbound: 22, 80, 443 only; outbound: default allow is normal). This does not replace **host** `ufw` or fixing a compromise, but adds a second layer and makes “only these ports from the internet” obvious in one place.

---

## 11. Deploy checklist on a brand-new IP

1. Create Droplet → **immediately** sections 1–5 (SSH, `ufw`, updates, Nginx compose, fail2ban).  
2. Add the **new** Droplet IP to managed Postgres **Trusted Sources** and any other allowlists.  
3. Clone repo to `/root/HungerHankerings`, create **fresh** `.env` and `jwt_key.pem` (do not reuse from a compromised host unless you are certain they were never exposed).  
4. Bring the stack up with **`docker-compose.nginx.yml`** so rate limiting applies (see [DEPLOY-VIA-GITHUB.md](./DEPLOY-VIA-GITHUB.md)).  
5. Point **DNS** (A/AAAA) at the new IP; update GitHub Actions secrets **`DROPLET_IP`** if you use auto-deploy.  
6. Revoke or rotate any API keys you suspect could have been read from the old server.
