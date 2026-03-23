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
const canadian_province_tax_zone_strategy_1 = require("./plugins/tax/canadian-province-tax-zone-strategy");
const postal_zone_plugin_1 = require("./plugins/shipping-plugin/postal-zone.plugin");
const shipping_plugin_1 = require("./plugins/shipping-plugin");
require("dotenv").config();
/** In production, use SMTP if configured; otherwise noop so verification/password-reset emails are not sent until SMTP_* are set. */
function buildEmailTransport() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (host && user && pass) {
        const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
        console.info(`[vendure] EmailPlugin: SMTP enabled (${host}:${port}, user=${user})`);
        return {
            transport: {
                type: "smtp",
                host,
                port,
                secure: process.env.SMTP_SECURE === "true",
                auth: { user, pass },
                logging: true,
            },
        };
    }
    console.warn("[vendure] EmailPlugin: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Verification emails are dropped — nothing reaches Resend.");
    return { transport: { type: "none" } };
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
/** Set VENDURE_REQUIRE_EMAIL_VERIFICATION=false to skip customer email verification (dev/testing only). */
const requireCustomerEmailVerification = process.env.VENDURE_REQUIRE_EMAIL_VERIFICATION !== "false";
if (isProduction && !requireCustomerEmailVerification) {
    console.warn("[vendure] VENDURE_REQUIRE_EMAIL_VERIFICATION=false — customers can sign in without confirming email. Turn this off before real launch.");
}
// In production restrict CORS to APP_URL; in dev allow all (localhost)
const corsOptions = isProduction && process.env.APP_URL ? { origin: [process.env.APP_URL] } : true;
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
        guestCheckoutStrategy: new core_1.DefaultGuestCheckoutStrategy({
            allowGuestCheckoutForRegisteredCustomers: true,
        }),
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
        asset_server_plugin_1.AssetServerPlugin.init({
            route: "assets",
            assetUploadDir: assetDir,
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            route: "admin",
            port: 3002,
        }),
        email_plugin_1.EmailPlugin.init(process.env.NODE_ENV === "production"
            ? {
                templatePath: path_1.default.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
                outputPath: path_1.default.join(assetDir, "test-emails"),
                route: "mailbox",
                handlers: email_plugin_1.defaultEmailHandlers,
                ...buildEmailTransport(),
                globalTemplateVars: {
                    baseUrl: process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
                    passwordResetUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/reset-password",
                    verifyEmailAddressUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/account/confirm",
                    // Resend rejects unverified domains; use SMTP_FROM=noreply@yourverifieddomain.com in prod
                    fromAddress: process.env.SMTP_FROM?.trim() || "Hunger Hankerings <onboarding@resend.dev>",
                },
            }
            : {
                templatePath: path_1.default.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
                devMode: true,
                outputPath: path_1.default.join(assetDir, "test-emails"),
                route: "mailbox",
                handlers: email_plugin_1.defaultEmailHandlers,
                globalTemplateVars: {
                    baseUrl: process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000",
                    passwordResetUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/reset-password",
                    verifyEmailAddressUrl: (process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000") + "/account/confirm",
                    fromAddress: process.env.SMTP_FROM?.trim() || "Hunger Hankerings <onboarding@resend.dev>",
                },
            }),
    ],
});
exports.config = vendureConfig;
