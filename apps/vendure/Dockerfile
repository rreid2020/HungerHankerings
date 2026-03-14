FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build
# Use pre-built admin-ui from context when present (e.g. from CI); otherwise build here (may OOM on small droplets).
RUN if [ ! -d admin-ui/dist ] || [ -z "$(ls -A admin-ui/dist 2>/dev/null)" ]; then npm run build:admin; else echo "Using pre-built admin-ui"; fi

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin-ui ./admin-ui
RUN mkdir -p /app/assets

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
