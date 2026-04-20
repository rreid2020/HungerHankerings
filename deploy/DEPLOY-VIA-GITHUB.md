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

The workflow in `.github/workflows/deploy-droplet.yml` deploys when you push to `main`: it checks out the repo, then runs **`ssh`** on the GitHub runner (same OpenSSH as your laptop) and streams **`deploy/droplet-deploy-remote.sh`** to the droplet — no third-party Docker SSH action.

### Setup (one-time)

1. **Use a deploy SSH key without a passphrase** (recommended for CI; passphrase-protected keys often fail with the action).
   - On your machine: `ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy"`
   - Add `deploy_key.pub` to the Droplet: `echo "contents of deploy_key.pub" >> /root/.ssh/authorized_keys` (as root).
   - Use the **private** key contents for `DROPLET_SSH_KEY` below (no passphrase). You can delete the key files after adding the secret.

2. In GitHub: repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

3. Add these repository secrets:

   | Name | Value |
   |------|--------|
   | `DROPLET_IP` | Your droplet’s public IP (e.g. `68.183.199.85`) |
   | `DROPLET_SSH_KEY` | Full contents of the **private** deploy key (entire file, including `-----BEGIN ... KEY-----` / `-----END ... KEY-----`). |
   | `DROPLET_SSH_KEY_PASSPHRASE` | **Only if** the private key has a passphrase: the exact passphrase (same string you type locally). Omit if the key has no passphrase. |

   For CI, a dedicated **deploy key with no passphrase** is simplest. Passphrase-protected keys need `ssh-agent`/`sshpass` to automate — not wired in this workflow; use an unencrypted deploy key for Actions.

4. On the **droplet**, the app must already be under `/root/HungerHankerings` and that directory must be a git clone of the repo (so `git fetch` / `git reset` work). If you used “clone from GitHub” when setting up the droplet, you’re set. If you used SCP, either reclone there or run `git init` and `git remote add origin https://github.com/rreid2020/HungerHankerings.git` so the workflow can pull.

After that, every push to `main` will run the workflow. Check **Actions** in the GitHub repo to see runs and logs.

**Note:** The workflow does not change `.env` or `jwt_key.pem` on the server. Those stay as you configured them. Only code from the repo is updated.

### Deploy failed: `ssh.ParsePrivateKey: ssh: no key found` / `no supported methods remain`

Usually one of these:

1. **Wrong material in `DROPLET_SSH_KEY`** — It must be the **private** key (OpenSSH format: begins with `-----BEGIN OPENSSH PRIVATE KEY-----` or `-----BEGIN RSA PRIVATE KEY-----`), not the `.pub` file. PuTTY `.ppk` files do not work until exported as OpenSSH from PuTTYgen.
2. **Broken newlines** — The secret must include the full key with line breaks. Re-paste the entire private key in **Settings → Secrets → Actions →** edit `DROPLET_SSH_KEY`.
3. **Passphrase** — This workflow uses plain `ssh` without `ssh-agent`. Use a **passphraseless** deploy key for CI, or you’ll need to change the workflow to support interactive/crypto unlocking.

The workflow writes the private key under **`~/.ssh/ci_deploy_key`** (mode `600`) on the runner and runs **`ssh -i … root@$DROPLET_IP`**, matching how you connect from your PC.

### Deploy failed: `ssh: this private key is passphrase protected`

Add secret **`DROPLET_SSH_KEY_PASSPHRASE`** with the exact passphrase for that private key. Redeploy. Or use a CI-only deploy key with **no** passphrase and update `DROPLET_SSH_KEY` + droplet `authorized_keys`.

### Deploy failed: `container name "...hungerhankerings-redis-1" is already in use`

Usually `docker compose down` did not remove old containers (e.g. a previous partial deploy). On the droplet:

```bash
export COMPOSE_PROJECT_NAME=hungerhankerings
cd /root/HungerHankerings
set -a && . ./.env && set +a
comp="docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml"
$comp down --remove-orphans --timeout 120
docker ps -aq --filter "label=com.docker.compose.project=hungerhankerings" | xargs -r docker rm -f
```

Then re-run the GitHub Action or run the same compose build/up steps manually.
