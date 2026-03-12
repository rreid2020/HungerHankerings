import path from "path";
import {
  DefaultJobQueuePlugin,
  defaultConfig,
  dummyPaymentHandler,
  mergeConfig,
  VendureConfig,
} from "@vendure/core";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { defaultEmailHandlers, EmailPlugin } from "@vendure/email-plugin";
import {
  regionShippingCalculator,
  regionShippingEligibilityChecker,
} from "./plugins/shipping-plugin";

require("dotenv").config();

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
// In production restrict CORS to APP_URL; in dev allow all (localhost)
const corsOptions =
  isProduction && process.env.APP_URL ? { origin: [process.env.APP_URL] } : true;

const vendureConfig: VendureConfig = mergeConfig(defaultConfig, {
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
    synchronize: process.env.NODE_ENV !== "production",
    // SSL: set DB_SSL=false to disable. For self-signed certs set DB_SSL_REJECT_UNAUTHORIZED=false
    ssl:
      process.env.DB_SSL === "false"
        ? false
        : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
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
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  shippingOptions: {
    shippingEligibilityCheckers: [regionShippingEligibilityChecker],
    shippingCalculators: [regionShippingCalculator],
  },
  plugins: [
    DefaultJobQueuePlugin,
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: assetDir,
    }),
    AdminUiPlugin.init({
      route: "admin",
      port: 3002,
    }),
    EmailPlugin.init({
      templatePath: path.join(__dirname, "..", "node_modules", "@vendure", "email-plugin", "templates"),
      devMode: true,
      outputPath: path.join(assetDir, "test-emails"),
      route: "mailbox",
      handlers: defaultEmailHandlers,
    }),
  ],
});

export const config = vendureConfig;
