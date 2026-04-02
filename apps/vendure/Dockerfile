FROM node:20-alpine AS builder

WORKDIR /app

# Line-by-line progress in CI; --no-audit --no-fund to reduce work
ENV CI=true
ENV npm_config_progress=false
# Droplet/CI builds often hit transient ECONNRESET from registry.npmjs.org; retry fetches
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=15000
ENV npm_config_fetch_retry_maxtimeout=120000
COPY package.json ./
# postinstall patches @vendure/payments-plugin; must exist before npm install
COPY scripts/vendor-patch-stripe-service.cjs ./scripts/
COPY vendor-patches/stripe.service.js ./vendor-patches/
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Prefer line-by-line progress in CI so the build log shows activity (avoids "stalled" appearance)
ENV CI=true
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=15000
ENV npm_config_fetch_retry_maxtimeout=120000

COPY package.json ./
COPY scripts/vendor-patch-stripe-service.cjs ./scripts/
COPY vendor-patches/stripe.service.js ./vendor-patches/
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/assets

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
