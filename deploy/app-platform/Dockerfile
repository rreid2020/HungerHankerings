# Single Web Service: Vendure (API + Admin) + Vendure worker + Next.js storefront + nginx edge.
# Build from repository root (DigitalOcean: source_dir `/`, dockerfile_path `deploy/app-platform/Dockerfile`).
# syntax=docker/dockerfile:1

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

FROM node:20-alpine
RUN apk add --no-cache nginx supervisor \
  && rm -f /etc/nginx/http.d/default.conf

COPY deploy/app-platform/nginx-main.conf /etc/nginx/nginx.conf
COPY deploy/app-platform/nginx-app.conf.template /etc/nginx/app-platform-server.conf.template
COPY deploy/app-platform/supervisord.conf /etc/supervisord.conf
COPY deploy/app-platform/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && sed -i 's/\r$//' /docker-entrypoint.sh \
  && mkdir -p /run/nginx /var/log/supervisor \
  && (test -e /var/run || ln -sf /run /var/run)

COPY --from=vendure-app /app/vendure /app/vendure
COPY --from=storefront-build /storefront /app/storefront

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

# Use CMD (not only ENTRYPOINT) so platforms that look for a "default process" see a start command.
CMD ["/docker-entrypoint.sh"]
