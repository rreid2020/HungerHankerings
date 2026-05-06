import path from "path";
import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  defaultConfig,
  dummyPaymentHandler,
  LanguageCode,
  mergeConfig,
  TypeORMHealthCheckStrategy,
  VendureConfig,
} from "@vendure/core";
import { getAmountInStripeMinorUnits } from "@vendure/payments-plugin/package/stripe/stripe-utils";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin, configureS3AssetStorage } from "@vendure/asset-server-plugin";
import { StripePlugin } from "@vendure/payments-plugin/package/stripe";
import {
  emailAddressChangeHandler,
  emailVerificationHandler,
  EmailPlugin,
  passwordResetHandler,
} from "@vendure/email-plugin";
import { FallbackEmailTemplateLoader } from "./fallback-email-template-loader";
import { orderConfirmationEmailHandler } from "./order-confirmation-email-handler";
import { ordersInboxNotificationHandler } from "./orders-inbox-email-handler";
import { RelaxedOrderByCodeAccessStrategy } from "./relaxed-order-by-code-access-strategy";
import { canadianProvinceTaxZoneStrategy } from "./plugins/tax/canadian-province-tax-zone-strategy";
import { PostalZonePlugin } from "./plugins/shipping-plugin/postal-zone.plugin";
import {
  postalShippingCalculator,
  postalShippingEligibilityChecker,
} from "./plugins/shipping-plugin";
import { LinkGuestCheckoutStrategy } from "./link-guest-checkout-strategy";

require("dotenv").config();

/**
 * SMTP when `SMTP_HOST` is set. User/pass optional (Mailpit and other local catchers use no auth on port 1025).
 * If host is unset in production, emails are dropped (verification, orders inbox, etc.).
 */
function buildEmailTransport(): {
  transport:
    | {
        type: "smtp";
        host: string;
        port: number;
        secure?: boolean;
        auth?: { user: string; pass: string };
        logging?: boolean;
      }
    | { type: "none" };
} {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[vendure] EmailPlugin: SMTP_HOST not set — outgoing mail disabled (verification, password reset, orders inbox)."
      );
    }
    return { transport: { type: "none" } };
  }
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const auth = user && pass ? { user, pass } : undefined;
  const hostLower = host.toLowerCase();
  const likelyNeedsAuth =
    hostLower.includes("resend") ||
    hostLower.includes("sendgrid") ||
    hostLower.includes("amazonaws.com");
  if (!auth && likelyNeedsAuth) {
    console.warn(
      "[vendure] EmailPlugin: SMTP_HOST points at a provider that requires auth, but SMTP_USER or SMTP_PASS is missing — mail will not reach Resend/etc. Set SMTP_USER (e.g. resend) and SMTP_PASS (API key).",
    );
  }
  console.info(
    `[vendure] EmailPlugin: SMTP enabled (${host}:${port}${auth ? `, user=${user}` : ", no auth — e.g. Mailpit"})`,
  );
  return {
    transport: {
      type: "smtp",
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      ...(auth ? { auth } : {}),
      // Verbose SMTP transcript logging can leak credentials / message content; keep for local dev only.
      logging: process.env.NODE_ENV !== "production",
    },
  };
}

/**
 * Production browser CORS: fail closed if APP_URL is missing (never fall back to `origin: true`).
 * Includes apex + www variants when applicable. Optional comma-separated APP_CORS_EXTRA_ORIGINS.
 */
function buildProductionCors():
  | boolean
  | { origin: string[] | false; credentials: boolean } {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    console.error(
      "[vendure] APP_URL must be set in production — CORS disabled until fixed (browsers cannot call the Shop API cross-origin).",
    );
    return { origin: false, credentials: true };
  }
  const origins = new Set<string>();
  const normalized = appUrl.replace(/\/$/, "");
  origins.add(normalized);
  try {
    const u = new URL(appUrl);
    const host = u.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    // Pair apex <-> www only for real hostnames, not raw IPv4/IPv6 literals.
    const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const isIpv6 = host.includes(":");
    if (!isLocal && !isIpv4 && !isIpv6 && host.includes(".")) {
      if (host.startsWith("www.")) {
        const bare = host.slice(4);
        origins.add(`${u.protocol}//${bare}${u.port ? `:${u.port}` : ""}`.replace(/\/$/, ""));
      } else {
        origins.add(`${u.protocol}//www.${host}${u.port ? `:${u.port}` : ""}`.replace(/\/$/, ""));
      }
    }
  } catch {
    console.warn(`[vendure] APP_URL could not be parsed for CORS extras: ${appUrl}`);
  }
  for (const raw of (process.env.APP_CORS_EXTRA_ORIGINS ?? "").split(",")) {
    const o = raw.trim().replace(/\/$/, "");
    if (o) {
      origins.add(o);
    }
  }
  return {
    origin: [...origins],
    credentials: true,
  };
}

if (process.env.NODE_ENV === "production") {
  const warn = (name: string, defaultVal: string) => {
    if (!process.env[name] || process.env[name] === defaultVal) {
      console.warn(`[vendure] Security: set ${name} in production (currently using default).`);
    }
  };
  warn("COOKIE_SECRET", "dev-cookie-secret");
  warn("SUPERADMIN_USERNAME", "superadmin");
  warn("SUPERADMIN_PASSWORD", "superadmin");
}

const port = parseInt(process.env.PORT ?? "3000", 10);
const assetDir = process.env.ASSET_UPLOAD_DIR ?? path.join(__dirname, "../assets");
const isProduction = process.env.NODE_ENV === "production";

/** Slower SQL polling on small hosts (e.g. DO App 1 vCPU + worker + Next) reduces DB contention with Shop API. */
const jobQueuePlugin = isProduction
  ? DefaultJobQueuePlugin.init({ pollInterval: 4000, concurrency: 1 })
  : DefaultJobQueuePlugin;

/**
 * Pre-built Admin UI defaults to apiHost localhost:3000. In production the browser must call the
 * public origin (same host Nginx exposes for /admin-api). See https://docs.vendure.io/guides/deployment/deploying-admin-ui/
 */
function buildAdminUiConfigFromAppUrl():
  | { apiHost: string; apiPort: number }
  | undefined {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) {
    if (isProduction) {
      console.warn(
        "[vendure] APP_URL is unset — Admin UI will try localhost:3000 for the Admin API from your browser. Set APP_URL to the storefront origin (e.g. https://yourdomain.com or http://YOUR_DROPLET_IP).",
      );
    }
    return undefined;
  }
  try {
    const u = new URL(appUrl);
    const defaultPort = u.protocol === "https:" ? 443 : 80;
    const apiPort = u.port ? parseInt(u.port, 10) : defaultPort;
    const apiHost = `${u.protocol}//${u.hostname}`;
    return { apiHost, apiPort };
  } catch {
    console.warn(`[vendure] APP_URL is not a valid URL for Admin UI: ${appUrl}`);
    return undefined;
  }
}

const adminUiPublicApi = buildAdminUiConfigFromAppUrl();

/**
 * DigitalOcean Spaces (S3-compatible). When all vars are set, binaries live in Spaces and survive droplet rebuilds.
 * @see https://docs.digitalocean.com/products/spaces/how-to/use-aws-sdks/
 * Region slug must match the Space (e.g. tor1, nyc3) — same as in the control panel URL.
 */
function buildAssetServerPlugin() {
  const bucket = process.env.DO_SPACES_BUCKET?.trim();
  const accessKeyId = process.env.DO_SPACES_KEY?.trim();
  const secretAccessKey = process.env.DO_SPACES_SECRET?.trim();
  const regionSlug = process.env.DO_SPACES_REGION?.trim();

  const base = { route: "assets" as const, assetUploadDir: assetDir };

  if (bucket && accessKeyId && secretAccessKey && regionSlug) {
    const endpoint = `https://${regionSlug}.digitaloceanspaces.com`;
    console.info(
      `[vendure] AssetServerPlugin: storing uploads in DigitalOcean Spaces bucket "${bucket}" (${endpoint}).`,
    );
    return AssetServerPlugin.init({
      ...base,
      storageStrategyFactory: configureS3AssetStorage({
        bucket,
        credentials: { accessKeyId, secretAccessKey },
        nativeS3Configuration: {
          endpoint,
          // DO requires this literal for bucket creation / SDK compatibility (datacenter comes from endpoint).
          region: "us-east-1",
          forcePathStyle: false,
        },
      }),
    });
  }

  if (isProduction && (bucket || accessKeyId || secretAccessKey || regionSlug)) {
    console.warn(
      "[vendure] Partial DO Spaces config (set all of DO_SPACES_BUCKET, DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION) — using local disk for assets.",
    );
  }
  return AssetServerPlugin.init(base);
}

/** Set VENDURE_REQUIRE_EMAIL_VERIFICATION=false to skip customer email verification (dev/testing only). */
const requireCustomerEmailVerification =
  process.env.VENDURE_REQUIRE_EMAIL_VERIFICATION !== "false";
if (isProduction && !requireCustomerEmailVerification) {
  console.warn(
    "[vendure] VENDURE_REQUIRE_EMAIL_VERIFICATION=false — customers can sign in without confirming email. Turn this off before real launch."
  );
}
// In production restrict CORS to APP_URL (plus www / APP_CORS_EXTRA_ORIGINS); in dev allow all (localhost)
const corsOptions = isProduction ? buildProductionCors() : true;

const smtpHostConfigured = Boolean(process.env.SMTP_HOST?.trim());
/** Dev file mailbox at /mailbox only when not sending via SMTP (e.g. use Mailpit with SMTP_HOST=mailpit). */
const useEmailDevMode = !isProduction && !smtpHostConfigured;
const emailTemplateLoader = new FallbackEmailTemplateLoader(
  path.join(__dirname, "..", "email-templates"),
  path.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
);
const ordersInboxSeparateEmailJob =
  process.env.ORDERS_INBOX_SEPARATE_EMAIL === "true" ||
  process.env.ORDERS_INBOX_SEPARATE_EMAIL === "1";

const ordersAndDefaultEmailHandlers = [
  orderConfirmationEmailHandler,
  emailVerificationHandler,
  passwordResetHandler,
  emailAddressChangeHandler,
  ...(ordersInboxSeparateEmailJob ? [ordersInboxNotificationHandler] : []),
];
const emailOutputPath = path.join(assetDir, "test-emails");
const emailGlobalTemplateVars = {
  baseUrl: process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
  passwordResetUrl:
    (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/reset-password",
  verifyEmailAddressUrl:
    (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/account/confirm",
  fromAddress:
    process.env.SMTP_FROM?.trim() || "Hunger Hankerings <onboarding@resend.dev>",
  /** Header/footer branding (override via env for white-label) */
  storeDisplayName: process.env.STORE_DISPLAY_NAME?.trim() || "Hunger Hankerings",
  storeTagline:
    process.env.STORE_EMAIL_TAGLINE?.trim() ||
    "Artisan treats and gifts delivered across Canada",
  emailCopyrightYear: new Date().getFullYear(),
};

const vendureConfig: VendureConfig = mergeConfig(defaultConfig, {
  customFields: {
    Order: [
      ...(defaultConfig.customFields?.Order ?? []),
      {
        name: "checkoutGiftSurchargeCents",
        type: "int",
        nullable: true,
        public: true,
        readonly: false,
        internal: false,
        label: [{ languageCode: LanguageCode.en, value: "Checkout gift surcharge (minor units)" }],
        description: [
          {
            languageCode: LanguageCode.en,
            value:
              "Set at checkout when the customer selects gift wrap. Added to the Stripe PaymentIntent; not an order line.",
          },
        ],
      },
    ],
  },
  apiOptions: {
    hostname: "0.0.0.0",
    port,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    cors: corsOptions,
    // Default Vendure introspection is true — disable in production to reduce schema exposure.
    introspection: !isProduction,
    adminApiPlayground: false,
    shopApiPlayground: false,
    adminApiDebug: false,
    shopApiDebug: false,
  },
  dbConnectionOptions: {
    type: "postgres",
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USER ?? "vendure",
    password: process.env.DB_PASSWORD ?? "vendure",
    database: process.env.DB_NAME ?? "vendure",
    // In production use migrations only, unless RUN_SCHEMA_SYNC=1 for one-time initial schema creation
    synchronize:
      process.env.NODE_ENV !== "production" || process.env.RUN_SCHEMA_SYNC === "1",
    // SSL: set DB_SSL=false to disable. For self-signed certs set DB_SSL_REJECT_UNAUTHORIZED=false
    ssl:
      process.env.DB_SSL === "false"
        ? false
        : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
    // Set LOG_SQL=true on droplet to log every query (find the one that references order_order_customer)
    ...(process.env.LOG_SQL === "true" ? { logging: true } : {}),
  },
  authOptions: {
    requireVerification: requireCustomerEmailVerification,
    // Bearer so headless storefront (Next.js) can receive token and send it on each request
    tokenMethod: ["bearer", "cookie"],
    cookieOptions: {
      secret: process.env.COOKIE_SECRET ?? "dev-cookie-secret",
      path: "/",
      sameSite: "lax",
      // Default false so sessions work over HTTP (e.g. IP address before TLS). Set VENDURE_COOKIE_SECURE=true when you only serve HTTPS.
      secure: process.env.VENDURE_COOKIE_SECURE === "true",
    },
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME ?? "superadmin",
      password: process.env.SUPERADMIN_PASSWORD ?? "superadmin",
    },
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  // Stripe: create Payment Method in Admin with "Stripe payments" and set API key + webhook secret
  //
  // Guest checkout with an email that already belongs to a registered user would otherwise get
  // EmailAddressConflictError and never attach a Customer to the order. Allowing merge links the order
  // to the existing customer record (required for a proper customer on the order in Admin).
  orderOptions: {
    guestCheckoutStrategy: new LinkGuestCheckoutStrategy({
      allowGuestCheckoutForRegisteredCustomers: true,
    }),
    /** Guest confirmation: allow orderByCode when `orderPlacedAt` not yet set (Stripe lag). */
    orderByCodeAccessStrategy: new RelaxedOrderByCodeAccessStrategy("2h"),
  },
  // Checkout note: if the default Customer role includes Permission.Owner, the Shop API can return
  // empty nextOrderStates / skip transitions for logged-in users. Prefer Customer having UpdateOrder
  // without Owner, or use guest checkout — see storefront checkout error text for details.
  taxOptions: {
    taxZoneStrategy: canadianProvinceTaxZoneStrategy,
  },
  shippingOptions: {
    shippingEligibilityCheckers: [postalShippingEligibilityChecker],
    shippingCalculators: [postalShippingCalculator],
  },
  /**
   * Default Vendure health checks include a TypeORM ping; it can intermittently fail or exceed upstream
   * timeouts when the DB is busy (single 1GB container running API + worker + Next). App Platform then
   * shows **Degraded** even though the server booted. We disable DB checks unless explicitly enabled.
   * Set `VENDURE_HEALTHCHECK_DATABASE=true` to restore the default DB probe on `/health`.
   */
  systemOptions: {
    healthChecks:
      process.env.VENDURE_HEALTHCHECK_DATABASE === "1" ||
      process.env.VENDURE_HEALTHCHECK_DATABASE === "true"
        ? [new TypeORMHealthCheckStrategy()]
        : [],
  },
  plugins: [
    PostalZonePlugin,
    jobQueuePlugin,
    DefaultSearchPlugin.init({}),
    StripePlugin.init({
      storeCustomersInStripe: true,
      paymentIntentCreateParams: (_injector, _ctx, order) => {
        const raw = order.customFields?.checkoutGiftSurchargeCents as number | null | undefined;
        const extra = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
        const base = getAmountInStripeMinorUnits(order);
        // Storefront uses Stripe Card Element + `confirmCardPayment`. Vendure's default
        // `automatic_payment_methods: { enabled: true }` targets Payment Element; with
        // Card Element, Stripe often returns "Your card number is incomplete" for valid PANs.
        const cardOnlyPi: Record<string, unknown> = {
          automatic_payment_methods: { enabled: false },
          payment_method_types: ["card"],
        };
        if (extra > 0) {
          // Stripe types omit `amount` from overrides; runtime merge replaces PI amount.
          cardOnlyPi.amount = base + extra;
        }
        return cardOnlyPi;
      },
    }),
    buildAssetServerPlugin(),
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
      ...(adminUiPublicApi ? { adminUiConfig: adminUiPublicApi } : {}),
    }),
    EmailPlugin.init(
      useEmailDevMode
        ? {
            templateLoader: emailTemplateLoader,
            devMode: true,
            outputPath: emailOutputPath,
            route: "mailbox",
            handlers: ordersAndDefaultEmailHandlers,
            globalTemplateVars: emailGlobalTemplateVars,
          }
        : {
            templateLoader: emailTemplateLoader,
            outputPath: emailOutputPath,
            route: "mailbox",
            handlers: ordersAndDefaultEmailHandlers,
            globalTemplateVars: emailGlobalTemplateVars,
            ...buildEmailTransport(),
          },
    ),
  ],
});

export const config = vendureConfig;
