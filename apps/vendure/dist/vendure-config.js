"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const core_1 = require("@vendure/core");
const stripe_utils_1 = require("@vendure/payments-plugin/package/stripe/stripe-utils");
const admin_ui_plugin_1 = require("@vendure/admin-ui-plugin");
const asset_server_plugin_1 = require("@vendure/asset-server-plugin");
const stripe_1 = require("@vendure/payments-plugin/package/stripe");
const email_plugin_1 = require("@vendure/email-plugin");
const fallback_email_template_loader_1 = require("./fallback-email-template-loader");
const orders_inbox_email_handler_1 = require("./orders-inbox-email-handler");
const relaxed_order_by_code_access_strategy_1 = require("./relaxed-order-by-code-access-strategy");
const canadian_province_tax_zone_strategy_1 = require("./plugins/tax/canadian-province-tax-zone-strategy");
const postal_zone_plugin_1 = require("./plugins/shipping-plugin/postal-zone.plugin");
const shipping_plugin_1 = require("./plugins/shipping-plugin");
const link_guest_checkout_strategy_1 = require("./link-guest-checkout-strategy");
require("dotenv").config();
/**
 * SMTP when `SMTP_HOST` is set. User/pass optional (Mailpit and other local catchers use no auth on port 1025).
 * If host is unset in production, emails are dropped (verification, orders inbox, etc.).
 */
function buildEmailTransport() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
        if (process.env.NODE_ENV === "production") {
            console.warn("[vendure] EmailPlugin: SMTP_HOST not set — outgoing mail disabled (verification, password reset, orders inbox).");
        }
        return { transport: { type: "none" } };
    }
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const auth = user && pass ? { user, pass } : undefined;
    const hostLower = host.toLowerCase();
    const likelyNeedsAuth = hostLower.includes("resend") ||
        hostLower.includes("sendgrid") ||
        hostLower.includes("amazonaws.com");
    if (!auth && likelyNeedsAuth) {
        console.warn("[vendure] EmailPlugin: SMTP_HOST points at a provider that requires auth, but SMTP_USER or SMTP_PASS is missing — mail will not reach Resend/etc. Set SMTP_USER (e.g. resend) and SMTP_PASS (API key).");
    }
    console.info(`[vendure] EmailPlugin: SMTP enabled (${host}:${port}${auth ? `, user=${user}` : ", no auth — e.g. Mailpit"})`);
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
    const warn = (name, defaultVal) => {
        if (!process.env[name] || process.env[name] === defaultVal) {
            console.warn(`[vendure] Security: set ${name} in production (currently using default).`);
        }
    };
    warn("COOKIE_SECRET", "dev-cookie-secret");
    warn("SUPERADMIN_USERNAME", "superadmin");
    warn("SUPERADMIN_PASSWORD", "superadmin");
}
const port = parseInt(process.env.PORT ?? "3000", 10);
const assetDir = process.env.ASSET_UPLOAD_DIR ?? path_1.default.join(__dirname, "../assets");
const isProduction = process.env.NODE_ENV === "production";
/**
 * Pre-built Admin UI defaults to apiHost localhost:3000. In production the browser must call the
 * public origin (same host Nginx exposes for /admin-api). See https://docs.vendure.io/guides/deployment/deploying-admin-ui/
 */
function buildAdminUiConfigFromAppUrl() {
    const appUrl = process.env.APP_URL?.trim();
    if (!appUrl) {
        if (isProduction) {
            console.warn("[vendure] APP_URL is unset — Admin UI will try localhost:3000 for the Admin API from your browser. Set APP_URL to the storefront origin (e.g. https://yourdomain.com or http://YOUR_DROPLET_IP).");
        }
        return undefined;
    }
    try {
        const u = new URL(appUrl);
        const defaultPort = u.protocol === "https:" ? 443 : 80;
        const apiPort = u.port ? parseInt(u.port, 10) : defaultPort;
        const apiHost = `${u.protocol}//${u.hostname}`;
        return { apiHost, apiPort };
    }
    catch {
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
    const base = { route: "assets", assetUploadDir: assetDir };
    if (bucket && accessKeyId && secretAccessKey && regionSlug) {
        const endpoint = `https://${regionSlug}.digitaloceanspaces.com`;
        console.info(`[vendure] AssetServerPlugin: storing uploads in DigitalOcean Spaces bucket "${bucket}" (${endpoint}).`);
        return asset_server_plugin_1.AssetServerPlugin.init({
            ...base,
            storageStrategyFactory: (0, asset_server_plugin_1.configureS3AssetStorage)({
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
        console.warn("[vendure] Partial DO Spaces config (set all of DO_SPACES_BUCKET, DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION) — using local disk for assets.");
    }
    return asset_server_plugin_1.AssetServerPlugin.init(base);
}
/** Set VENDURE_REQUIRE_EMAIL_VERIFICATION=false to skip customer email verification (dev/testing only). */
const requireCustomerEmailVerification = process.env.VENDURE_REQUIRE_EMAIL_VERIFICATION !== "false";
if (isProduction && !requireCustomerEmailVerification) {
    console.warn("[vendure] VENDURE_REQUIRE_EMAIL_VERIFICATION=false — customers can sign in without confirming email. Turn this off before real launch.");
}
// In production restrict CORS to APP_URL; in dev allow all (localhost)
const corsOptions = isProduction && process.env.APP_URL ? { origin: [process.env.APP_URL] } : true;
const smtpHostConfigured = Boolean(process.env.SMTP_HOST?.trim());
/** Dev file mailbox at /mailbox only when not sending via SMTP (e.g. use Mailpit with SMTP_HOST=mailpit). */
const useEmailDevMode = !isProduction && !smtpHostConfigured;
const emailTemplateLoader = new fallback_email_template_loader_1.FallbackEmailTemplateLoader(path_1.default.join(__dirname, "..", "email-templates"), path_1.default.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"));
const ordersAndDefaultEmailHandlers = [...email_plugin_1.defaultEmailHandlers, orders_inbox_email_handler_1.ordersInboxNotificationHandler];
const emailOutputPath = path_1.default.join(assetDir, "test-emails");
const emailGlobalTemplateVars = {
    baseUrl: process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
    passwordResetUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/reset-password",
    verifyEmailAddressUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/account/confirm",
    fromAddress: process.env.SMTP_FROM?.trim() || "Hunger Hankerings <onboarding@resend.dev>",
};
const vendureConfig = (0, core_1.mergeConfig)(core_1.defaultConfig, {
    customFields: {
        Order: [
            ...(core_1.defaultConfig.customFields?.Order ?? []),
            {
                name: "checkoutGiftSurchargeCents",
                type: "int",
                nullable: true,
                public: true,
                readonly: false,
                internal: false,
                label: [{ languageCode: core_1.LanguageCode.en, value: "Checkout gift surcharge (minor units)" }],
                description: [
                    {
                        languageCode: core_1.LanguageCode.en,
                        value: "Set at checkout when the customer selects gift wrap. Added to the Stripe PaymentIntent; not an order line.",
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
        synchronize: process.env.NODE_ENV !== "production" || process.env.RUN_SCHEMA_SYNC === "1",
        // SSL: set DB_SSL=false to disable. For self-signed certs set DB_SSL_REJECT_UNAUTHORIZED=false
        ssl: process.env.DB_SSL === "false"
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
        paymentMethodHandlers: [core_1.dummyPaymentHandler],
    },
    // Stripe: create Payment Method in Admin with "Stripe payments" and set API key + webhook secret
    //
    // Guest checkout with an email that already belongs to a registered user would otherwise get
    // EmailAddressConflictError and never attach a Customer to the order. Allowing merge links the order
    // to the existing customer record (required for a proper customer on the order in Admin).
    orderOptions: {
        guestCheckoutStrategy: new link_guest_checkout_strategy_1.LinkGuestCheckoutStrategy({
            allowGuestCheckoutForRegisteredCustomers: true,
        }),
        /** Guest confirmation: allow orderByCode when `orderPlacedAt` not yet set (Stripe lag). */
        orderByCodeAccessStrategy: new relaxed_order_by_code_access_strategy_1.RelaxedOrderByCodeAccessStrategy("2h"),
    },
    // Checkout note: if the default Customer role includes Permission.Owner, the Shop API can return
    // empty nextOrderStates / skip transitions for logged-in users. Prefer Customer having UpdateOrder
    // without Owner, or use guest checkout — see storefront checkout error text for details.
    taxOptions: {
        taxZoneStrategy: canadian_province_tax_zone_strategy_1.canadianProvinceTaxZoneStrategy,
    },
    shippingOptions: {
        shippingEligibilityCheckers: [shipping_plugin_1.postalShippingEligibilityChecker],
        shippingCalculators: [shipping_plugin_1.postalShippingCalculator],
    },
    plugins: [
        postal_zone_plugin_1.PostalZonePlugin,
        core_1.DefaultJobQueuePlugin,
        core_1.DefaultSearchPlugin.init({}),
        stripe_1.StripePlugin.init({
            storeCustomersInStripe: true,
            paymentIntentCreateParams: (_injector, _ctx, order) => {
                const raw = order.customFields?.checkoutGiftSurchargeCents;
                const extra = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
                if (extra <= 0) {
                    return {};
                }
                const base = (0, stripe_utils_1.getAmountInStripeMinorUnits)(order);
                // Stripe types omit `amount` from overrides; runtime merge replaces PI amount.
                return { amount: base + extra };
            },
        }),
        buildAssetServerPlugin(),
        admin_ui_plugin_1.AdminUiPlugin.init({
            route: "admin",
            port: 3002,
            ...(adminUiPublicApi ? { adminUiConfig: adminUiPublicApi } : {}),
        }),
        email_plugin_1.EmailPlugin.init(useEmailDevMode
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
            }),
    ],
});
exports.config = vendureConfig;
