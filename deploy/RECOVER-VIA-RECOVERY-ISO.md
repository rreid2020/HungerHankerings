# Recover files from a Droplet using the Recovery ISO

Use this when the Droplet is compromised (e.g. DDoS notice from DigitalOcean) and you need to copy off `.env`, `jwt_key.pem`, and other project files **before** destroying it. The Recovery ISO boots a clean environment and mounts the Droplet’s disk so you can read files without running the compromised system.

---

## If the Droplet was already disconnected from the network

DigitalOcean may have disabled the Droplet’s network access. To pull files to your PC with `scp`, the Droplet needs a working connection.

1. Open a support ticket: <https://cloudsupport.digitalocean.com/>
2. Say you need to **recover data** from the Droplet (reference the DDoS/compromise notice) and ask for **temporary reconnection** of the Droplet’s network so you can transfer files off via SSH/SCP. Once you’re done, you’ll destroy the Droplet.

Wait for support to confirm the network is re-enabled before relying on SSH/SCP from your PC.

---

## Step 1: Boot from the Recovery ISO

1. In DigitalOcean: open the Droplet (e.g. **Hunger-Hankerings** at **68.183.199.85**).
2. **Power off** the Droplet (toggle on the Droplet page, or use **Power** → **Power Off**).
3. In the left sidebar click **Recovery**.
4. Select **Boot from Recovery ISO**.
5. **Power on** the Droplet again (toggle or **Power** → **Power On**).

---

## Step 2: Open the Recovery Console

1. In the left sidebar click **Access**.
2. Under **Recovery Console**, click **Launch Recovery Console** (use this, not “Droplet Console”).
3. A new window opens with the recovery menu. If you don’t see a prompt, click in the console and press **Enter**.

You’ll see a menu like:

```
DigitalOcean Recovery Environment
...
1. Mount your Disk Image [Not Mounted]
2. Check Filesystem
...
6. Interactive Shell [/bin/bash]
7. ...
```

Note the **root password** shown in the message (e.g. `exam-ple0-1234-5678`). You’ll need it to log in over SSH from your PC, or to use the shell in the console.

---

## Step 3: Mount the Droplet’s disk

1. Type **1** and press **Enter** to choose **Mount your Disk Image**.
2. Wait until it says the disk is mounted (e.g. **Mounted**).
3. Type **6** and press **Enter** for **Interactive Shell**.

The Droplet’s root filesystem is now under **`/mnt`**. Your project was at `/root/HungerHankerings`, so in recovery it is:

- **`/mnt/root/HungerHankerings/`**

---

## Step 4: Check that the files are there

In the recovery shell, run:

```bash
ls -la /mnt/root/HungerHankerings/.env
ls -la /mnt/root/HungerHankerings/jwt_key.pem
ls -la /mnt/root/HungerHankerings/docker-compose.jwt.yml
```

If any of these are missing, list the directory:

```bash
ls -la /mnt/root/HungerHankerings/
```

---

## Step 5: Copy files to your PC

From your **PC** (PowerShell), with the Droplet’s IP and your SSH key. The recovery environment has SSH enabled and (usually) has your Droplet’s SSH keys; use the **root password** from the recovery menu if key login fails.

**One-time:** create a folder for the recovered files, e.g.:

```powershell
mkdir C:\Users\Roger\HungerHankerings\recovered
cd C:\Users\Roger\HungerHankerings\recovered
```

**Copy the important files** (use the key path where your `hungerhankerings` key lives; it may be in the project folder):

```powershell
scp -i C:\Users\Roger\HungerHankerings\hungerhankerings root@68.183.199.85:/mnt/root/HungerHankerings/.env .
scp -i C:\Users\Roger\HungerHankerings\hungerhankerings root@68.183.199.85:/mnt/root/HungerHankerings/jwt_key.pem .
scp -i C:\Users\Roger\HungerHankerings\hungerhankerings root@68.183.199.85:/mnt/root/HungerHankerings/docker-compose.jwt.yml .
```

If the droplet is on Recovery ISO, the host key will be different. Remove the old key once, then run the commands above:
```powershell
ssh-keygen -R 68.183.199.85
```

If SSH key fails, the recovery ISO may not have it; use the **root password** from the recovery menu (no `-i`):

```powershell
scp root@68.183.199.85:/mnt/root/HungerHankerings/.env .
scp root@68.183.199.85:/mnt/root/HungerHankerings/jwt_key.pem .
scp root@68.183.199.85:/mnt/root/HungerHankerings/docker-compose.jwt.yml .
```

(Replace `68.183.199.85` if your Droplet has a different IP.)

**Optional – whole project:**

```powershell
scp -i C:\Users\Roger\HungerHankerings\hungerhankerings -r root@68.183.199.85:/mnt/root/HungerHankerings .
```

That creates `HungerHankerings` in your current directory with the full project from the disk.

---

## Step 6: Put files in your local repo (for redeploy)

- Copy **`.env`** from `recovered\.env` to **`C:\Users\Roger\HungerHankerings\.env`** (project root).
- Copy **`jwt_key.pem`** from `recovered\jwt_key.pem` to **`C:\Users\Roger\HungerHankerings\jwt_key.pem`** (project root).
- If you use **`docker-compose.jwt.yml`**, copy it to the project root as well.

Then follow **deploy/MIGRATE-TO-NEW-DROPLET-NO-VPC.md** to create a **new** Droplet and redeploy (do not keep using the compromised one).

---

## Step 7: Destroy the old Droplet

1. In DigitalOcean, **power off** the Droplet.
2. In **Recovery**, switch back to **Boot from Hard Drive** (so the next owner isn’t handed a recovery boot).
3. **Destroy** the Droplet from the control panel when you’re done with recovery.

You’ll be billed until the Droplet is destroyed; destroying it is the right step after recovering what you need.
