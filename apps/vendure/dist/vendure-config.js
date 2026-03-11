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
const email_plugin_1 = require("@vendure/email-plugin");
const shipping_plugin_1 = require("./plugins/shipping-plugin");
require("dotenv").config();
const port = parseInt(process.env.PORT ?? "3000", 10);
const assetDir = process.env.ASSET_UPLOAD_DIR ?? path_1.default.join(__dirname, "../assets");
const vendureConfig = (0, core_1.mergeConfig)(core_1.defaultConfig, {
    apiOptions: {
        port,
        adminApiPath: "admin-api",
        shopApiPath: "shop-api",
        cors: true,
    },
    dbConnectionOptions: {
        type: "postgres",
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "5432", 10),
        username: process.env.DB_USER ?? "vendure",
        password: process.env.DB_PASSWORD ?? "vendure",
        database: process.env.DB_NAME ?? "vendure",
        synchronize: process.env.NODE_ENV !== "production",
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
    shippingOptions: {
        shippingEligibilityCheckers: [shipping_plugin_1.regionShippingEligibilityChecker],
        shippingCalculators: [shipping_plugin_1.regionShippingCalculator],
    },
    plugins: [
        core_1.DefaultJobQueuePlugin,
        asset_server_plugin_1.AssetServerPlugin.init({
            route: "assets",
            assetUploadDir: assetDir,
        }),
        admin_ui_plugin_1.AdminUiPlugin.init({
            route: "admin",
            port: 3002,
        }),
        email_plugin_1.EmailPlugin.init({
            devMode: true,
            outputPath: path_1.default.join(assetDir, "test-emails"),
            route: "mailbox",
            handlers: email_plugin_1.defaultEmailHandlers,
        }),
    ],
});
exports.config = vendureConfig;
