# syntax=docker/dockerfile:1
# Single Web Service: Vendure + worker + Next.js + nginx on $PORT (default 8080).
# Repo root: App Platform auto-detects Docker (avoids Node buildpack / Procfile on root package.json).
# Build context = repository root. Supporting files: deploy/app-platform/*.conf, docker-entrypoint.sh

FROM node:20-alpine AS vendure-build
WORKDIR /vendure
ENV CI=true
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=15000
ENV npm_config_fetch_retry_maxtimeout=120000
COPY apps/vendure/package.json ./
COPY apps/vendure/scripts ./scripts/
COPY apps/vendure/vendor-patches ./vendor-patches/
RUN npm install --no-audit --no-fund
COPY apps/vendure .
RUN npm run build

FROM node:20-alpine AS vendure-app
WORKDIR /app/vendure
ENV CI=true
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=15000
ENV npm_config_fetch_retry_maxtimeout=120000
COPY apps/vendure/package.json ./
COPY apps/vendure/scripts ./scripts/
COPY apps/vendure/vendor-patches ./vendor-patches/
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=vendure-build /vendure/dist ./dist
COPY --from=vendure-build /vendure/email-templates ./email-templates
RUN mkdir -p assets

FROM node:20-alpine AS storefront-build
WORKDIR /storefront
ARG NEXT_PUBLIC_VENDURE_SHOP_API_URL=
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_VENDURE_SHOP_API_URL=${NEXT_PUBLIC_VENDURE_SHOP_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV CI=true
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
COPY storefront/package.json ./
RUN npm install --no-audit --no-fund
COPY storefront .
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS directus-app
WORKDIR /app/directus
ENV CI=true
ENV npm_config_progress=false
ENV npm_config_fetch_retries=5
COPY apps/directus/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY apps/directus/extensions ./extensions
COPY apps/directus/start.sh ./
RUN chmod +x start.sh \
  && sed -i 's/\r$//' start.sh

FROM node:20-alpine
RUN apk add --no-cache nginx supervisor \
  && rm -f /etc/nginx/http.d/default.conf

COPY deploy/app-platform/nginx-main.conf /etc/nginx/nginx.conf
COPY deploy/app-platform/nginx-app.conf.template /etc/nginx/app-platform-server.conf.template
COPY deploy/app-platform/nginx-directus-ops.conf.template /etc/nginx/directus-ops-server.conf.template
COPY deploy/app-platform/supervisord.conf /etc/supervisord.conf
COPY deploy/app-platform/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && sed -i 's/\r$//' /docker-entrypoint.sh \
  && mkdir -p /run/nginx /var/log/supervisor \
  && (test -e /var/run || ln -sf /run /var/run)

COPY --from=vendure-app /app/vendure /app/vendure
COPY --from=storefront-build /storefront /app/storefront
COPY --from=directus-app /app/directus /app/directus

EXPOSE 8080
ENV NODE_ENV=production
# Do not set PORT here — App Platform sets PORT=8080 for nginx; supervisord forces Vendure PORT=3000.

CMD ["/docker-entrypoint.sh"]
