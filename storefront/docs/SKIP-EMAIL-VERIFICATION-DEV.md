# Skip customer email verification (dev / testing)

To test **sign-up and the customer dashboard** without configuring SMTP or clicking verification links:

1. In **Vendure’s environment** (droplet `.env` or local Compose), set:

   ```env
   VENDURE_REQUIRE_EMAIL_VERIFICATION=false
   ```

2. **Rebuild and restart Vendure** (and worker) so the new config loads, e.g. on the droplet:

   ```bash
   docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d --force-recreate vendure vendure-worker
   ```

3. **New registrations** can sign in immediately after creating an account.

**Notes**

- Turn verification **back on** (`true` or remove the line; default is on) before production launch.
- Accounts created **while verification was required** may still be marked unverified in the DB. Either register a **new email** after flipping the flag, or mark the customer verified in **Vendure Admin → Customers**.
