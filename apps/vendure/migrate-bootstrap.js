/**
 * Migration entry point. Loads .env from THIS directory (apps/vendure) before
 * any other code runs, then runs the real migrate script. Run from apps/vendure:
 *   node migrate-bootstrap.js
 * Or from repo root: pnpm --filter vendure run migrate
 */
const path = require("path");
const dotenv = require("dotenv");

// .env is next to this file (apps/vendure/.env)
const envPath = path.join(__dirname, ".env");
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  console.error("Failed to load .env from", envPath, result.error.message);
  process.exit(1);
}

// Now run the actual migrator (env is set)
require("./dist/migrate.js");
