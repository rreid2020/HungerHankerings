FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm run build:admin

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
