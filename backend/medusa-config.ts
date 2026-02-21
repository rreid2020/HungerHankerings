import * as dotenv from "dotenv"

dotenv.config()

const isProd = process.env.NODE_ENV === "production"

const stripeSecret = process.env.STRIPE_SECRET
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripeEnabled =
  stripeSecret && !stripeSecret.includes("...") && stripeWebhookSecret

const config = {
  projectConfig: {
    database_type: "postgres",
    database_url: process.env.DATABASE_URL,
    database_extra: isProd
      ? {
          ssl: {
            rejectUnauthorized: false
          }
        }
      : undefined,
    database_typeorm_synchronize: !isProd,
    redis_url: process.env.REDIS_URL,
    store_cors: process.env.STORE_CORS,
    admin_cors: process.env.ADMIN_CORS,
    jwt_secret: process.env.JWT_SECRET || "supersecret",
    cookie_secret: process.env.COOKIE_SECRET || "supersecret"
  },
  plugins: [
    {
      resolve: "medusa-payment-manual",
      options: {}
    },
    {
      resolve: "medusa-fulfillment-manual",
      options: {}
    },
    {
      resolve: "@medusajs/admin",
      options: {
        backend: "http://localhost:9000",
        develop: {
          port: 7001
        }
      }
    },
    ...(stripeEnabled
      ? [
          {
            resolve: "medusa-payment-stripe",
            options: {
              api_key: stripeSecret,
              webhook_secret: stripeWebhookSecret
            }
          }
        ]
      : [])
  ]
}

module.exports = config
