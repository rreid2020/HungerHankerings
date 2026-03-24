import path from "path";
import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  defaultConfig,
  dummyPaymentHandler,
  LanguageCode,
  mergeConfig,
  VendureConfig,
} from "@vendure/core";
import { getAmountInStripeMinorUnits } from "@vendure/payments-plugin/package/stripe/stripe-utils";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { StripePlugin } from "@vendure/payments-plugin/package/stripe";
import { defaultEmailHandlers, EmailPlugin } from "@vendure/email-plugin";
import { FallbackEmailTemplateLoader } from "./fallback-email-template-loader";
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
      logging: true,
    },
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
/** Set VENDURE_REQUIRE_EMAIL_VERIFICATION=false to skip customer email verification (dev/testing only). */
const requireCustomerEmailVerification =
  process.env.VENDURE_REQUIRE_EMAIL_VERIFICATION !== "false";
if (isProduction && !requireCustomerEmailVerification) {
  console.warn(
    "[vendure] VENDURE_REQUIRE_EMAIL_VERIFICATION=false — customers can sign in without confirming email. Turn this off before real launch."
  );
}
// In production restrict CORS to APP_URL; in dev allow all (localhost)
const corsOptions =
  isProduction && process.env.APP_URL ? { origin: [process.env.APP_URL] } : true;

const smtpHostConfigured = Boolean(process.env.SMTP_HOST?.trim());
/** Dev file mailbox at /mailbox only when not sending via SMTP (e.g. use Mailpit with SMTP_HOST=mailpit). */
const useEmailDevMode = !isProduction && !smtpHostConfigured;
const emailTemplateLoader = new FallbackEmailTemplateLoader(
  path.join(__dirname, "..", "email-templates"),
  path.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
);
const ordersAndDefaultEmailHandlers = [...defaultEmailHandlers, ordersInboxNotificationHandler];
const emailOutputPath = path.join(assetDir, "test-emails");
const emailGlobalTemplateVars = {
  baseUrl: process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
  passwordResetUrl:
    (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/reset-password",
  verifyEmailAddressUrl:
    (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/account/confirm",
  fromAddress:
    process.env.SMTP_FROM?.trim() || "Hunger Hankerings <onboarding@resend.dev>",
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
  plugins: [
    PostalZonePlugin,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin.init({}),
    StripePlugin.init({
      storeCustomersInStripe: true,
      paymentIntentCreateParams: (_injector, _ctx, order) => {
        const raw = order.customFields?.checkoutGiftSurchargeCents as number | null | undefined;
        const extra = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
        if (extra <= 0) {
          return {};
        }
        const base = getAmountInStripeMinorUnits(order);
        // Stripe types omit `amount` from overrides; runtime merge replaces PI amount.
        return { amount: base + extra } as Record<string, unknown>;
      },
    }),
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: assetDir,
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
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
