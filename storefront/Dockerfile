FROM node:20-alpine

WORKDIR /app

# Pass at build time so storefront works from any device
ARG NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/
ENV NEXT_PUBLIC_SALEOR_API_URL=$NEXT_PUBLIC_SALEOR_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Channel slug (e.g. canada-international). Must match so Add to Cart uses same channel as products.
ARG NEXT_PUBLIC_SALEOR_CHANNEL=default-channel
ENV NEXT_PUBLIC_SALEOR_CHANNEL=$NEXT_PUBLIC_SALEOR_CHANNEL

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
