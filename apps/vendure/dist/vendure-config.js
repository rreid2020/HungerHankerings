"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const core_1 = require("@vendure/core");
const admin_ui_plugin_1 = require("@vendure/admin-ui-plugin");
const asset_server_plugin_1 = require("@vendure/asset-server-plugin");
const stripe_1 = require("@vendure/payments-plugin/package/stripe");
const email_plugin_1 = require("@vendure/email-plugin");
const canadian_province_tax_zone_strategy_1 = require("./plugins/tax/canadian-province-tax-zone-strategy");
const postal_zone_plugin_1 = require("./plugins/shipping-plugin/postal-zone.plugin");
const shipping_plugin_1 = require("./plugins/shipping-plugin");
require("dotenv").config();
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
// In production restrict CORS to APP_URL; in dev allow all (localhost)
const corsOptions = isProduction && process.env.APP_URL ? { origin: [process.env.APP_URL] } : true;
const vendureConfig = (0, core_1.mergeConfig)(core_1.defaultConfig, {
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
        tokenMethod: "cookie",
        cookieOptions: {
            secret: process.env.COOKIE_SECRET ?? "dev-cookie-secret",
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
        stripe_1.StripePlugin.init({ storeCustomersInStripe: true }),
        asset_server_plugin_1.AssetServerPlugin.init({
            route: "assets",
            assetUploadDir: assetDir,
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            route: "admin",
            port: 3002,
        }),
        email_plugin_1.EmailPlugin.init({
            templatePath: path_1.default.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
            devMode: true,
            outputPath: path_1.default.join(assetDir, "test-emails"),
            route: "mailbox",
            handlers: email_plugin_1.defaultEmailHandlers,
        }),
    ],
});
exports.config = vendureConfig;
