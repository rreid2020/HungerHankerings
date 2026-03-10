# Deploy via GitHub

Now that the repo is on GitHub, you can:

1. **New droplet:** Clone the repo instead of SCP (see [MIGRATE-TO-NEW-DROPLET-NO-VPC.md](MIGRATE-TO-NEW-DROPLET-NO-VPC.md) Step 2 Option A).
2. **Updates:** On the droplet run `git pull` then rebuild/restart, or use the GitHub Action below to deploy on every push to `main`.

---

## One-time: Clone on a new Droplet

SSH into the droplet, then:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/rreid2020/HungerHankerings.git /root/HungerHankerings
cd /root/HungerHankerings
```

Add `.env` and `jwt_key.pem` (not in the repo), install Docker, generate `docker-compose.jwt.yml`, add the droplet IP to the managed DB trusted sources, then:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.jwt.yml -f docker-compose.nginx.yml up -d
```

---

## Optional: Auto-deploy on push (GitHub Actions)

The workflow in `.github/workflows/deploy-droplet.yml` deploys to your droplet when you push to `main`: it SSHs in, pulls the latest code, rebuilds images, and restarts the stack.

### Setup (one-time)

1. In GitHub: repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

2. Add two secrets:

   | Name             | Value |
   |------------------|--------|
   | `DROPLET_IP`     | Your droplet’s public IP (e.g. `68.183.199.85`) |
   | `DROPLET_SSH_KEY`| Full contents of your **private** SSH key (e.g. the `hungerhankerings` key). Paste the entire key including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`. |

3. On the **droplet**, the app must already be under `/root/HungerHankerings` and that directory must be a git clone of the repo (so `git fetch` / `git reset` work). If you used “clone from GitHub” when setting up the droplet, you’re set. If you used SCP, either reclone there or run `git init` and `git remote add origin https://github.com/rreid2020/HungerHankerings.git` so the workflow can pull.

After that, every push to `main` will run the workflow. Check **Actions** in the GitHub repo to see runs and logs.

**Note:** The workflow does not change `.env` or `jwt_key.pem` on the server. Those stay as you configured them. Only code from the repo is updated.
