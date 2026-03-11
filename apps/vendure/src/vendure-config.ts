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

const port = parseInt(process.env.PORT ?? "3000", 10);
const assetDir = process.env.ASSET_UPLOAD_DIR ?? path.join(__dirname, "../assets");

const vendureConfig: VendureConfig = mergeConfig(defaultConfig, {
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
    // DigitalOcean and most managed Postgres require SSL
    ssl: process.env.DB_SSL !== "false" ? { rejectUnauthorized: true } : false,
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
