#!/usr/bin/env node
/**
 * Apply one set of box-size prices to all product variants in Saleor.
 * Set prices once in SIZE_PRICES; every variant with that size gets the same price.
 *
 * Requires: SALEOR_API_URL, SALEOR_STAFF_EMAIL + SALEOR_STAFF_PASSWORD (or SALEOR_STAFF_TOKEN)
 * Optional: SIZE_PRICES (default below), SALEOR_CHANNEL_SLUG, BOX_SIZE_ATTRIBUTE_SLUG
 *
 * Example: SIZE_PRICES='Small:10,Medium:15,Large:20,X-Large:25'
 */

const SALEOR_API_URL = process.env.SALEOR_API_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL || "http://localhost:8000/graphql/";
const CHANNEL_SLUG = process.env.SALEOR_CHANNEL_SLUG || "default-channel";
const BOX_SIZE_ATTRIBUTE_SLUG = process.env.BOX_SIZE_ATTRIBUTE_SLUG || "box-size";
const SIZE_PRICES_STR = process.env.SIZE_PRICES || "Small:10,Medium:15,Large:20,X-Large:25";

const SIZE_PRICES = Object.fromEntries(
  SIZE_PRICES_STR.split(",").map((part) => {
    const [name, price] = part.split(":").map((s) => s.trim());
    return [name, price];
  })
);

async function graphql(query, variables = {}, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(SALEOR_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

async function getToken() {
  if (process.env.SALEOR_STAFF_TOKEN) return process.env.SALEOR_STAFF_TOKEN;
  const email = process.env.SALEOR_STAFF_EMAIL;
  const password = process.env.SALEOR_STAFF_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set SALEOR_STAFF_EMAIL and SALEOR_STAFF_PASSWORD, or SALEOR_STAFF_TOKEN (Dashboard: Configuration → Staff → your user → Create token with MANAGE_PRODUCTS)"
    );
  }
  const data = await graphql(
    `mutation TokenCreate($email: String!, $password: String!) {
      tokenCreate(email: $email, password: $password) {
        token
        errors { code message }
      }
    }`,
    { email, password }
  );
  const err = data?.tokenCreate?.errors?.[0];
  if (err) throw new Error(err.message || "Login failed");
  return data.tokenCreate.token;
}

async function getChannelId(token) {
  const data = await graphql(
    `query Channels { channels { id slug } }`,
    {},
    token
  );
  const ch = data.channels?.find((c) => c.slug === CHANNEL_SLUG);
  if (!ch) throw new Error(`Channel not found: ${CHANNEL_SLUG}. Available: ${data.channels?.map((c) => c.slug).join(", ")}`);
  return ch.id;
}

async function* fetchAllVariants(token) {
  let after = null;
  do {
    const data = await graphql(
      `query ProductVariants($first: Int!, $channel: String, $after: String) {
        productVariants(first: $first, channel: $channel, after: $after) {
          edges { node {
            id
            name
            attributes(variantSelection: VARIANT_SELECTION) { attribute { slug } values { name } }
            channelListings { channel { id } }
          } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { first: 100, channel: CHANNEL_SLUG, after },
      token
    );
    const conn = data?.productVariants;
    if (!conn) throw new Error("productVariants query failed");
    for (const edge of conn.edges) yield edge.node;
    const { hasNextPage, endCursor } = conn.pageInfo;
    after = hasNextPage ? endCursor : null;
  } while (after);
}

function getSizeValue(variant) {
  const list = variant.attributes || variant.assignedAttributes || [];
  const att = list.find(
    (a) => a.attribute?.slug?.toLowerCase() === BOX_SIZE_ATTRIBUTE_SLUG.toLowerCase()
  );
  const name = att?.values?.[0]?.name;
  return name ? name.trim() : null;
}

async function updateVariantChannelListing(token, variantId, channelId, price) {
  const data = await graphql(
    `mutation ProductVariantChannelListingUpdate($id: ID!, $input: [ProductVariantChannelListingAddInput!]!) {
      productVariantChannelListingUpdate(id: $id, input: $input) {
        productVariant { id }
        errors { code message }
      }
    }`,
    {
      id: variantId,
      input: [{ channelId, price: String(price) }],
    },
    token
  );
  const err = data?.productVariantChannelListingUpdate?.errors?.[0];
  if (err) throw new Error(`Update failed: ${err.message}`);
}

async function main() {
  console.log("Size → price map:", SIZE_PRICES);
  console.log("Channel:", CHANNEL_SLUG, "| Box size attribute slug:", BOX_SIZE_ATTRIBUTE_SLUG);
  const token = await getToken();
  const channelId = await getChannelId(token);
  let updated = 0;
  let skipped = 0;
  for await (const variant of fetchAllVariants(token)) {
    const sizeName = getSizeValue(variant);
    if (!sizeName) {
      skipped++;
      continue;
    }
    const price = SIZE_PRICES[sizeName];
    if (price === undefined) {
      console.warn("No price for size:", sizeName, "variant:", variant.name);
      skipped++;
      continue;
    }
    const hasChannel = variant.channelListings?.some((cl) => cl.channel?.id === channelId);
    if (!hasChannel) {
      console.warn("Variant not in channel:", variant.name);
      skipped++;
      continue;
    }
    await updateVariantChannelListing(token, variant.id, channelId, price);
    updated++;
    console.log("Updated:", variant.name, "→", sizeName, price);
  }
  console.log("Done. Updated:", updated, "Skipped:", skipped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
