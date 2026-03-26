/**
 * Docker / npm install in apps/vendure does not apply the monorepo pnpm patch.
 * Copy our patched StripeService so stale Stripe customer IDs are cleared at runtime.
 * Safe to run multiple times (idempotent copy).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "vendor-patches", "stripe.service.js");
const dest = path.join(
  root,
  "node_modules",
  "@vendure",
  "payments-plugin",
  "package",
  "stripe",
  "stripe.service.js",
);

if (!fs.existsSync(src)) {
  console.warn("[vendor-patch-stripe-service] skip: missing", src);
  process.exit(0);
}
if (!fs.existsSync(path.dirname(dest))) {
  console.warn("[vendor-patch-stripe-service] skip: @vendure/payments-plugin not installed yet");
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log("[vendor-patch-stripe-service] applied to", dest);
