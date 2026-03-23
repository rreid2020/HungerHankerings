/**
 * Vendure Shop API client. Types represent the storefront’s domain model (orders, products, checkout, customer).
 */

const shopApiUrl =
  process.env.VENDURE_SHOP_API_URL ||
  process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL ||
  "http://localhost:3000/shop-api";

/** In dev, Vendure EmailPlugin serves captured emails here. Use this to get verification/reset links. */
export function getVendureMailboxUrl(): string {
  const base = shopApiUrl.replace(/\/shop-api\/?$/, "");
  return `${base}/mailbox`;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const REQUEST_TIMEOUT_MS = 10_000;

/** Pass when calling from server (e.g. API route) to authenticate with Vendure */
export type VendureRequestOptions = { cookie?: string; authToken?: string };

export async function fetchVendure<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { cookie?: string; authToken?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Send Bearer when we have a token (logged-in) and still forward Cookie so the shop session
  // (active cart) stays attached — Vendure prefers session cookie then falls back to Bearer.
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
    headers["vendure-auth-token"] = options.authToken;
  }
  if (options?.cookie) {
    headers.Cookie = options.cookie;
  }

  try {
    const res = await fetch(shopApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: controller.signal,
      credentials: "include",
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorPayload = (await res.json()) as GraphQLResponse<T>;
        const msg =
          errorPayload.errors?.[0]?.message ||
          `Vendure request failed: ${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      const text = await res.text();
      throw new Error(
        `Vendure API returned ${res.status}. Response: ${text.substring(0, 200)}`
      );
    }

    const payload = (await res.json()) as GraphQLResponse<T>;
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || "Vendure query failed");
    }
    if (!payload.data) {
      throw new Error("Vendure returned empty response");
    }
    return payload.data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Vendure request timed out. Is the API running?");
    }
    throw err;
  }
}

function assertNoErrors(
  errors: { message?: string }[] | null | undefined,
  label: string
) {
  if (!errors?.length) return;
  throw new Error(`${label}: ${errors[0]?.message || "Unknown error"}`);
}

/** Countries available in the active channel (from Vendure zones). Use for address/country dropdowns. */
export async function getAvailableCountries(
  opts?: VendureRequestOptions
): Promise<{ code: string; name: string }[]> {
  const data = await fetchVendure<{
    availableCountries: Array<{ code: string; name: string }>;
  }>(
    `
    query AvailableCountries {
      availableCountries {
        code
        name
      }
    }
  `,
    undefined,
    opts
  );
  return data?.availableCountries ?? [];
}

// ---------------------------------------------------------------------------
// Storefront domain types (Vendure API responses mapped to these shapes)
// ---------------------------------------------------------------------------

export type StorefrontVariantAttribute = {
  attribute: { name: string };
  values: { name: string }[];
};

export type StorefrontProductVariant = {
  id: string;
  name: string;
  pricing?: { price?: { gross?: { amount: number; currency: string } } };
  attributes?: StorefrontVariantAttribute[];
  quantityAvailable?: number;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: { url: string | null } | null;
  pricing?: {
    priceRange?: {
      start?: { gross?: { amount: number; currency: string } };
    };
  };
  variants?: StorefrontProductVariant[];
};

export type StorefrontCheckout = {
  id: string;
  /** Vendure order code (e.g. for redirects after Stripe Payment Intent) */
  code?: string;
  email?: string | null;
  lines: {
    id: string;
    quantity: number;
    totalPrice?: { gross?: { amount: number; currency: string } };
    variant: {
      id: string;
      name: string;
      product: { name: string; thumbnail?: { url: string | null } | null };
      pricing?: {
        /** Unit price ex tax (from order line; use for pre–tax checkout math). */
        price?: {
          net?: { amount: number; currency: string };
          /** Unit price inc tax (customer-facing). */
          gross?: { amount: number; currency: string };
        };
      };
      media?: { url: string }[];
    };
  }[];
  /** Line subtotals: net = ex tax, gross = inc tax (Vendure Money / 100). */
  subtotalPrice?: {
    net?: { amount: number; currency: string };
    gross?: { amount: number; currency: string };
  };
  totalPrice?: { gross?: { amount: number; currency: string } };
  shippingPrice?: {
    net?: { amount: number; currency: string };
    gross?: { amount: number; currency: string };
  };
};

export type StorefrontAddressInput = {
  firstName: string;
  lastName: string;
  streetAddress1: string;
  streetAddress2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  countryArea?: string | null;
  phone?: string | null;
};

export type StorefrontCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isConfirmed: boolean;
  dateJoined: string;
  addresses?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName?: string | null;
    streetAddress1: string;
    streetAddress2?: string | null;
    city: string;
    postalCode: string;
    country: { code: string; country: string };
    countryArea?: string | null;
    phone?: string | null;
    isDefaultShippingAddress?: boolean;
    isDefaultBillingAddress?: boolean;
  }[];
};

export type StorefrontOrder = {
  id: string;
  token: string;
  number: string;
  created: string;
  status: string;
  total: { gross: { amount: number; currency: string } };
  lines: {
    id: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: { gross: { amount: number; currency: string } };
    thumbnail?: { url: string | null } | null;
  }[];
  shippingAddress?: {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    streetAddress2?: string | null;
    city: string;
    postalCode: string;
    country: { code: string; country: string };
    countryArea?: string | null;
    phone?: string | null;
  } | null;
  billingAddress?: {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    streetAddress2?: string | null;
    city: string;
    postalCode: string;
    country: { code: string; country: string };
    countryArea?: string | null;
    phone?: string | null;
  } | null;
};

export type CheckoutCompleteResult = {
  order: StorefrontOrder | null;
  confirmationNeeded: boolean;
  confirmationData?: string | null;
  errors: { message?: string }[];
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Comma-separated product **slugs** to omit from storefront grids and PDP (e.g. internal gift add-on).
 * Must match Admin → product → **slug** exactly (case-insensitive).
 */
function hiddenProductSlugSet(): Set<string> {
  const raw = process.env.STOREFRONT_HIDDEN_PRODUCT_SLUGS?.trim() ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Comma-separated Vendure **product** ids (Admin product detail → ID in sidebar).
 * Use when slug is awkward or you want a sure match.
 */
function hiddenProductIdSet(): Set<string> {
  const raw = process.env.STOREFRONT_HIDDEN_PRODUCT_IDS?.trim() ?? "";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/** True = show in catalog / PDP */
function isCatalogProduct(p: { id: string; slug: string }): boolean {
  const hiddenIds = hiddenProductIdSet();
  if (hiddenIds.size > 0 && hiddenIds.has(String(p.id))) {
    return false;
  }
  const hiddenSlugs = hiddenProductSlugSet();
  if (hiddenSlugs.size > 0 && hiddenSlugs.has(p.slug.trim().toLowerCase())) {
    return false;
  }
  return true;
}

function isCatalogProductSlugKnownHidden(slug: string): boolean {
  const hiddenSlugs = hiddenProductSlugSet();
  return hiddenSlugs.size > 0 && hiddenSlugs.has(slug.trim().toLowerCase());
}

const productFields = `
  id
  name
  slug
  description
  featuredAsset { preview }
  variants {
    id
    name
    price
    priceWithTax
    stockLevel
    options {
      name
      code
      group { name code }
    }
  }
`;

/** Map Vendure ProductVariant.options → storefront attributes (one group = one dropdown). */
function vendureOptionsToAttributes(
  options?: Array<{
    name: string;
    code?: string;
    group?: { name?: string; code?: string } | null;
  }>
): StorefrontVariantAttribute[] {
  if (!options?.length) return [];
  return options.map((o) => {
    const groupLabel =
      (o.group?.name && o.group.name.trim()) ||
      (o.group?.code && o.group.code.trim()) ||
      "Option";
    return {
      attribute: { name: groupLabel },
      values: [{ name: o.name }],
    };
  });
}

function mapVendureProductToStorefront(p: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  featuredAsset?: { preview?: string } | null;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    priceWithTax: number;
    stockLevel?: string;
    options?: Array<{
      name: string;
      code?: string;
      group?: { name?: string; code?: string } | null;
    }>;
  }>;
}): StorefrontProduct {
  const amount = p.variants?.[0]?.price ?? 0;
  const currency = "CAD";
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? null,
    thumbnail: p.featuredAsset?.preview
      ? { url: p.featuredAsset.preview }
      : null,
    pricing: {
      priceRange: {
        start: { gross: { amount: amount / 100, currency } },
      },
    },
    variants:
      p.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        pricing: {
          price: {
            gross: { amount: v.price / 100, currency },
          },
        },
        quantityAvailable: v.stockLevel === "IN_STOCK" ? 999 : 0,
        attributes: vendureOptionsToAttributes(v.options),
      })) ?? [],
  };
}

export async function listProducts(): Promise<StorefrontProduct[]> {
  const data = await fetchVendure<{
    products: {
      items: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string | null;
        featuredAsset?: { preview?: string } | null;
        variants?: Array<{
          id: string;
          name: string;
          price: number;
          priceWithTax: number;
          stockLevel?: string;
          options?: Array<{
            name: string;
            code?: string;
            group?: { name?: string; code?: string } | null;
          }>;
        }>;
      }>;
    };
  }>(`
    query Products {
      products(options: { take: 100 }) {
        items {
          ${productFields}
        }
      }
    }
  `);
  const items = (data.products?.items ?? []).filter((p) => isCatalogProduct(p));
  return items.map(mapVendureProductToStorefront);
}

export async function getProductByHandle(
  slug: string
): Promise<StorefrontProduct | null> {
  if (isCatalogProductSlugKnownHidden(slug)) return null;
  const data = await fetchVendure<{
    product: {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      featuredAsset?: { preview?: string } | null;
      variants?: Array<{
        id: string;
        name: string;
        price: number;
        priceWithTax: number;
        stockLevel?: string;
        options?: Array<{
          name: string;
          code?: string;
          group?: { name?: string; code?: string } | null;
        }>;
      }>;
    } | null;
  }>(`
    query ProductBySlug($slug: String!) {
      product(slug: $slug) {
        ${productFields}
      }
    }
  `, { slug });
  if (!data.product) return null;
  const p = data.product as Parameters<typeof mapVendureProductToStorefront>[0];
  if (!isCatalogProduct({ id: p.id, slug: p.slug })) return null;
  return mapVendureProductToStorefront(p);
}

// ---------------------------------------------------------------------------
// Cart / Active Order (session-based; no checkout ID stored)
// ---------------------------------------------------------------------------

const activeOrderFragment = `
  id
  code
  state
  active
  lines {
    id
    quantity
    discountedUnitPrice
    discountedUnitPriceWithTax
    discountedLinePrice
    discountedLinePriceWithTax
    linePriceWithTax
    productVariant {
      id
      name
      price
      priceWithTax
      product { name featuredAsset { preview } }
      featuredAsset { preview }
    }
  }
  subTotal
  subTotalWithTax
  shipping
  shippingWithTax
  total
  totalWithTax
`;

function mapVendureOrderToCheckout(order: {
  id: string;
  code: string;
  lines?: Array<{
    id: string;
    quantity: number;
    discountedUnitPrice: number;
    discountedUnitPriceWithTax: number;
    discountedLinePrice: number;
    discountedLinePriceWithTax: number;
    linePriceWithTax: number;
    productVariant: {
      id: string;
      name: string;
      price: number;
      priceWithTax: number;
      product: { name: string; featuredAsset?: { preview?: string } | null };
      featuredAsset?: { preview?: string } | null;
    };
  }>;
  subTotal?: number;
  subTotalWithTax?: number;
  shipping?: number;
  shippingWithTax?: number;
  total?: number;
  totalWithTax?: number;
} | null): StorefrontCheckout | null {
  if (!order) return null;
  const currency = "CAD";
  return {
    id: order.id,
    email: undefined,
    lines:
      order.lines?.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        totalPrice: {
          gross: {
            amount: line.discountedLinePriceWithTax / 100,
            currency,
          },
        },
        variant: {
          id: line.productVariant.id,
          name: line.productVariant.name,
          product: {
            name: line.productVariant.product.name,
            thumbnail: (() => {
              const asset = line.productVariant.product.featuredAsset ?? line.productVariant.featuredAsset;
              return asset?.preview != null ? { url: asset.preview } : null;
            })(),
          },
          pricing: {
            price: {
              net: {
                amount: line.discountedUnitPrice / 100,
                currency,
              },
              gross: {
                amount: line.discountedUnitPriceWithTax / 100,
                currency,
              },
            },
          },
          media: line.productVariant.featuredAsset?.preview
            ? [{ url: line.productVariant.featuredAsset.preview }]
            : undefined,
        },
      })) ?? [],
    subtotalPrice:
      order.subTotal != null && order.subTotalWithTax != null
        ? {
            net: { amount: order.subTotal / 100, currency },
            gross: { amount: order.subTotalWithTax / 100, currency },
          }
        : undefined,
    shippingPrice:
      order.shipping != null && order.shippingWithTax != null
        ? {
            net: { amount: order.shipping / 100, currency },
            gross: { amount: order.shippingWithTax / 100, currency },
          }
        : undefined,
    totalPrice: order.totalWithTax != null ? { gross: { amount: order.totalWithTax / 100, currency } } : undefined,
  };
}

export async function getActiveOrder(opts?: VendureRequestOptions): Promise<StorefrontCheckout | null> {
  const data = await fetchVendure<{
    activeOrder: Parameters<typeof mapVendureOrderToCheckout>[0];
  }>(`
    query ActiveOrder {
      activeOrder {
        ${activeOrderFragment}
      }
    }
  `, undefined, opts);
  return mapVendureOrderToCheckout(data.activeOrder);
}

/**
 * True when the active order already has a Customer (logged-in shop session or after setCustomer).
 * Used by checkout API: {@link checkoutEmailUpdate} / setCustomerForOrder fails with "already logged in"
 * if the session is authenticated but no `vendure_token` cookie was sent (same situation as /api/auth/me
 * resolving the user from the session cookie alone).
 */
export async function activeOrderHasShopCustomer(
  opts?: VendureRequestOptions
): Promise<boolean> {
  const data = await fetchVendure<{
    activeOrder: { customer?: { id: string } | null } | null;
  }>(
    `
    query ActiveOrderCustomer {
      activeOrder {
        customer {
          id
        }
      }
    }
  `,
    undefined,
    opts
  );
  return !!data.activeOrder?.customer?.id;
}

/** For compatibility: in Vendure we use session; id is ignored and we return activeOrder */
export async function getCheckout(
  _id: string
): Promise<StorefrontCheckout | null> {
  return getActiveOrder();
}

/** Create order by adding lines; in Vendure the first addItemToOrder creates the order */
export async function createCheckout(params: {
  email?: string;
  lines: { variantId: string; quantity: number }[];
}): Promise<StorefrontCheckout> {
  type AddItemResult = { addItemToOrder: unknown };
  for (const line of params.lines) {
    const result = await fetchVendure<AddItemResult>(`
      mutation AddItemToOrder($variantId: ID!, $quantity: Int!) {
      addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
        ... on Order {
          ${activeOrderFragment}
        }
        ... on OrderModificationError {
          message
          errorCode
        }
      }
    }
    `, { variantId: line.variantId, quantity: line.quantity }, undefined);
    const addResult = result.addItemToOrder;
    if (addResult && typeof addResult === "object" && "message" in addResult && (addResult as { errorCode?: string }).errorCode) {
      throw new Error((addResult as { message?: string }).message || "Failed to add item");
    }
  }
  const order = await getActiveOrder();
  if (!order) throw new Error("Create checkout: no active order after adding items");
  return order;
}

export async function addItemToOrder(
  variantId: string,
  quantity: number,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{ addItemToOrder: unknown }>(`
    mutation AddItemToOrder($variantId: ID!, $quantity: Int!) {
      addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
        ... on Order {
          ${activeOrderFragment}
        }
        ... on OrderModificationError {
          message
          errorCode
        }
      }
    }
  `, { variantId, quantity }, opts);
  const result = data.addItemToOrder;
  if (result && typeof result === "object" && "errorCode" in result) {
    throw new Error((result as { message?: string }).message || "Failed to add item");
  }
  const order = await getActiveOrder();
  if (!order) throw new Error("No active order after add");
  return order;
}

export async function checkoutLinesAdd(
  _checkoutId: string,
  lines: { variantId: string; quantity: number }[]
): Promise<StorefrontCheckout> {
  for (const line of lines) {
    await addItemToOrder(line.variantId, line.quantity);
  }
  const order = await getActiveOrder();
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutLineUpdate(
  _checkoutId: string,
  lineId: string,
  quantity: number
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    adjustOrderLine?: { __typename: string } & Record<string, unknown>;
  }>(`
    mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
      adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
        ... on Order {
          ${activeOrderFragment}
        }
        ... on OrderModificationError {
          message
          errorCode
        }
      }
    }
  `, { orderLineId: lineId, quantity });
  const result = (data as { adjustOrderLine?: unknown }).adjustOrderLine;
  if (result && typeof result === "object" && "errorCode" in result) {
    throw new Error((result as { message?: string }).message || "Failed to update line");
  }
  const order = await getActiveOrder();
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutLineDelete(
  _checkoutId: string,
  lineId: string
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    removeOrderLine?: { __typename: string } & Record<string, unknown>;
  }>(`
    mutation RemoveOrderLine($orderLineId: ID!) {
      removeOrderLine(orderLineId: $orderLineId) {
        ... on Order {
          ${activeOrderFragment}
        }
        ... on OrderModificationError {
          message
          errorCode
        }
      }
    }
  `, { orderLineId: lineId });
  const result = (data as { removeOrderLine?: unknown }).removeOrderLine;
  if (result && typeof result === "object" && "errorCode" in result) {
    throw new Error((result as { message?: string }).message || "Failed to remove line");
  }
  const order = await getActiveOrder();
  if (!order) return { id: "", email: null, lines: [], subtotalPrice: undefined, totalPrice: undefined, shippingPrice: undefined };
  return order;
}

// ---------------------------------------------------------------------------
// Checkout flow: address, shipping method, payment
// ---------------------------------------------------------------------------

function toVendureAddress(addr: StorefrontAddressInput) {
  return {
    fullName: `${addr.firstName} ${addr.lastName}`.trim(),
    streetLine1: addr.streetAddress1,
    streetLine2: addr.streetAddress2 ?? undefined,
    city: addr.city,
    postalCode: addr.postalCode,
    province: addr.countryArea ?? undefined,
    countryCode: addr.country,
    phoneNumber: addr.phone ?? undefined,
  };
}

/** Shop API mutations return Order | ErrorResult; ensure we got an order id. */
function assertShopOrderMutationPayload(
  payload: { id?: string; message?: string; errorCode?: string } | null | undefined,
  action: string
): void {
  if (payload && typeof payload.id === "string" && payload.id.length > 0) {
    return;
  }
  const msg =
    payload && typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : `${action} failed`;
  throw new Error(msg);
}

async function shopTransitionOrderToState(
  state: string,
  opts?: VendureRequestOptions
): Promise<void> {
  const data = await fetchVendure<{
    transitionOrderToState:
      | { id?: string; state?: string }
      | { message?: string; transitionError?: string }
      | null;
  }>(
    `
    mutation ShopTransitionOrder($state: String!) {
      transitionOrderToState(state: $state) {
        ... on Order { id state }
        ... on OrderStateTransitionError { message transitionError fromState toState }
      }
    }
  `,
    { state },
    opts
  );
  const r = data.transitionOrderToState;
  if (r == null) {
    throw new Error(
      "Could not change order state (empty response). If you are logged in, try logging out and using guest checkout, or clear cookies and retry."
    );
  }
  if ("transitionError" in r && (r as { transitionError?: string }).transitionError) {
    const err = r as { message?: string; transitionError: string };
    throw new Error(err.message || err.transitionError);
  }
  if (!("id" in r) || !(r as { id?: string }).id) {
    throw new Error("Order state transition did not return an order.");
  }
}

export async function checkoutEmailUpdate(
  _checkoutId: string,
  email: string,
  opts?: VendureRequestOptions,
  firstName?: string,
  lastName?: string
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    setCustomerForOrder: { id?: string; message?: string; errorCode?: string } | null;
  }>(
    `
    mutation SetCustomerForOrder($input: CreateCustomerInput!) {
      setCustomerForOrder(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `,
    {
      input: {
        emailAddress: email,
        firstName: (firstName ?? "").trim() || "Guest",
        lastName: (lastName ?? "").trim() || "Guest",
      },
    },
    opts
  );
  assertShopOrderMutationPayload(data.setCustomerForOrder, "Set customer for order");
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutShippingAddressUpdate(
  _checkoutId: string,
  address: StorefrontAddressInput,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    setOrderShippingAddress: { id?: string; message?: string; errorCode?: string } | null;
  }>(
    `
    mutation SetOrderShippingAddress($input: CreateAddressInput!) {
      setOrderShippingAddress(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `,
    { input: toVendureAddress(address) },
    opts
  );
  assertShopOrderMutationPayload(data.setOrderShippingAddress, "Set shipping address");
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

/**
 * Persists gift add-on amount (minor units, tax-inclusive) on the active order for StripePlugin to add to the PaymentIntent.
 * Pass 0 or clear with null to reset (avoids stale values on retry).
 */
export async function setOrderCheckoutGiftSurchargeCents(
  cents: number | null,
  opts?: VendureRequestOptions
): Promise<void> {
  const customFields =
    cents != null && cents > 0 ? { checkoutGiftSurchargeCents: Math.floor(cents) } : { checkoutGiftSurchargeCents: null }
  const data = await fetchVendure<{
    setOrderCustomFields: { id?: string; message?: string; errorCode?: string } | null;
  }>(
    `
    mutation SetOrderCheckoutGiftSurcharge($input: UpdateOrderInput!) {
      setOrderCustomFields(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `,
    { input: { customFields } },
    opts
  )
  assertShopOrderMutationPayload(data.setOrderCustomFields, "Set order gift surcharge")
}

export async function checkoutBillingAddressUpdate(
  _checkoutId: string,
  address: StorefrontAddressInput,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    setOrderBillingAddress: { id?: string; message?: string; errorCode?: string } | null;
  }>(
    `
    mutation SetOrderBillingAddress($input: CreateAddressInput!) {
      setOrderBillingAddress(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `,
    { input: toVendureAddress(address) },
    opts
  );
  assertShopOrderMutationPayload(data.setOrderBillingAddress, "Set billing address");
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutCustomerAttach(
  _checkoutId: string,
  _authToken: string,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  return getActiveOrder(opts) as Promise<StorefrontCheckout>;
}

/** Returns shipping price in dollars (CAD) from Vendure postal code zones. Used for checkout order summary. */
export async function getShippingQuoteDollars(
  countryCode: string,
  postalCode: string,
  opts?: VendureRequestOptions
): Promise<number> {
  const data = await fetchVendure<{ shippingQuote: number }>(
    `query ShippingQuote($countryCode: String!, $postalCode: String!) {
      shippingQuote(countryCode: $countryCode, postalCode: $postalCode)
    }`,
    { countryCode: (countryCode || "").trim(), postalCode: (postalCode || "").trim() },
    opts
  );
  const cents = data?.shippingQuote ?? 0;
  return cents / 100;
}

export async function getCheckoutShippingMethods(
  _checkoutId: string,
  opts?: VendureRequestOptions
): Promise<{ id: string; name: string }[]> {
  const data = await fetchVendure<{
    eligibleShippingMethods: Array< { id: string; name: string; priceWithTax: number } >;
  }>(`
    query EligibleShippingMethods {
      eligibleShippingMethods {
        id
        name
        priceWithTax
      }
    }
  `, undefined, opts);
  return (data.eligibleShippingMethods ?? []).map((m) => ({ id: m.id, name: m.name }));
}

export async function checkoutDeliveryMethodUpdate(
  _checkoutId: string,
  deliveryMethodId: string,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    setOrderShippingMethod: { id?: string; message?: string; errorCode?: string } | null;
  }>(
    `
    mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
      setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `,
    { shippingMethodId: [deliveryMethodId] },
    opts
  );
  assertShopOrderMutationPayload(data.setOrderShippingMethod, "Set shipping method");
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

/**
 * Vendure only allows addPaymentToOrder when the order is in `ArrangingPayment`.
 * After addresses + shipping method, the order usually stays in `AddingItems` until this transition.
 */
/**
 * Vendure Stripe plugin: creates a Payment Intent for the active order (Shop API).
 * Do not use addPaymentToOrder with Stripe from the storefront — the webhook settles payment using Admin API.
 * @see https://docs.vendure.io/current/core/reference/core-plugins/payments-plugin/stripe-plugin
 */
export async function createStripePaymentIntent(opts?: VendureRequestOptions): Promise<string> {
  const data = await fetchVendure<{ createStripePaymentIntent: string }>(
    `
    mutation CreateStripePaymentIntent {
      createStripePaymentIntent
    }
  `,
    undefined,
    opts
  );
  const secret = data.createStripePaymentIntent;
  if (!secret?.trim()) {
    throw new Error("Failed to create Stripe payment intent");
  }
  return secret;
}

export async function checkoutTransitionToArrangingPayment(opts?: VendureRequestOptions): Promise<void> {
  const snap = await fetchVendure<{
    activeOrder: { state: string; nextOrderStates: string[] } | null;
  }>(
    `query ActiveOrderCheckoutState {
      activeOrder {
        state
        nextOrderStates
      }
    }`,
    undefined,
    opts
  );
  const active = snap.activeOrder;
  if (!active) {
    throw new Error("No active order");
  }

  let state = active.state;
  let nextStates = active.nextOrderStates ?? [];

  if (
    state === "ArrangingPayment" ||
    state === "PaymentAuthorized" ||
    state === "PaymentSettled"
  ) {
    return;
  }

  // Logged-in customers with Permission.Owner satisfy the auth guard but get authorizedAsOwnerOnly=false;
  // Vendure then returns [] for nextOrderStates and no-ops transitionOrderToState (null).
  if (
    nextStates.length === 0 &&
    (state === "AddingItems" || state === "Draft" || state === "Created")
  ) {
    throw new Error(
      "Checkout cannot continue: the server returned no allowed order transitions. " +
        "This often happens when logged in with a customer role that includes the Owner permission. " +
        "Try logging out and checking out as a guest, or ask an admin to adjust the Customer role permissions in Vendure."
    );
  }

  if (state === "Created" && nextStates.includes("AddingItems")) {
    await shopTransitionOrderToState("AddingItems", opts);
    const again = await fetchVendure<{
      activeOrder: { state: string; nextOrderStates: string[] } | null;
    }>(
      `query ActiveOrderCheckoutState2 {
        activeOrder { state nextOrderStates }
      }`,
      undefined,
      opts
    );
    state = again.activeOrder?.state ?? state;
    nextStates = again.activeOrder?.nextOrderStates ?? [];
  }

  await shopTransitionOrderToState("ArrangingPayment", opts);
}

export async function getCheckoutTotalPrice(
  _checkoutId: string,
  opts?: VendureRequestOptions
): Promise<number> {
  const data = await fetchVendure<{
    activeOrder: { totalWithTax?: number } | null;
  }>(`
    query ActiveOrderTotal {
      activeOrder { totalWithTax }
    }
  `, undefined, opts);
  const total = data.activeOrder?.totalWithTax;
  if (total == null) throw new Error("Could not get order total");
  return total / 100;
}

export async function checkoutPaymentCreate(
  _checkoutId: string,
  input: { gateway: string; amount: number; token?: string }
): Promise<void> {
  await fetchVendure(`
    mutation AddPaymentToOrder($input: PaymentInput!) {
      addPaymentToOrder(input: $input) {
        ... on Order { id state }
        ... on ErrorResult { message errorCode }
        ... on PaymentFailedError { message }
        ... on PaymentDeclinedError { message }
      }
    }
  `, {
    input: {
      method: input.gateway,
      metadata: input.token ? { token: input.token } : {},
    },
  });
}

export async function checkoutComplete(
  _checkoutId: string,
  _redirectUrl: string,
  options?: { paymentData?: string; metadata?: { key: string; value: string }[] },
  opts?: VendureRequestOptions
): Promise<CheckoutCompleteResult> {
  const baseMeta =
    options?.metadata?.reduce<Record<string, string>>(
      (acc, { key, value }) => ({ ...acc, [key]: value }),
      {}
    ) ?? {};

  // Stripe must use createStripePaymentIntent + client confirm + webhook (createPayment is admin-only in the handler).
  const method = process.env.VENDURE_DUMMY_PAYMENT_METHOD_CODE || "dummy-payment-method";
  const metadata: Record<string, string> = { ...baseMeta };

  try {
    const paymentResult = await fetchVendure<{
      addPaymentToOrder?: Parameters<typeof mapVendureOrderToOrder>[0] & {
        message?: string;
        __typename?: string;
      };
    }>(`
      mutation AddPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
          ... on Order {
            ${shopOrderFieldsForStorefront}
          }
          ... on ErrorResult { message errorCode }
          ... on PaymentFailedError { message }
          ... on PaymentDeclinedError { message }
        }
      }
    `, {
      input: {
        method,
        metadata,
      },
    }, opts);

    const raw = paymentResult.addPaymentToOrder;
    if (raw && typeof raw === "object" && "message" in raw && (raw as { message?: string }).message) {
      return {
        order: null,
        confirmationNeeded: false,
        errors: [{ message: (raw as { message: string }).message }],
      };
    }
    if (raw && typeof raw === "object" && "code" in raw && (raw as { code?: string }).code) {
      const mapped = mapVendureOrderToOrder(raw as Parameters<typeof mapVendureOrderToOrder>[0]);
      return {
        order: mapped,
        confirmationNeeded: false,
        errors: [],
      };
    }
  } catch (e) {
    return {
      order: null,
      confirmationNeeded: false,
      errors: [{ message: e instanceof Error ? e.message : "Payment failed" }],
    };
  }

  let orderCode: string | null = null;
  try {
    const orderData = await fetchVendure<{
      activeOrder: { code: string } | null;
    }>(`query { activeOrder { code } }`, undefined, opts);
    orderCode = orderData.activeOrder?.code ?? null;
  } catch {
    /* ignore */
  }
  if (!orderCode) {
    return {
      order: null,
      confirmationNeeded: false,
      errors: [{ message: "Could not get order after payment" }],
    };
  }
  // Fallback: orderByCode fails for logged-in shoppers on guest-checkout orders (Vendure access strategy).
  try {
    const fullOrder = await getOrderByCode(orderCode, opts);
    return {
      order: fullOrder ? mapVendureOrderToOrder(fullOrder) : null,
      confirmationNeeded: false,
      errors: [],
    };
  } catch {
    return {
      order: {
        id: orderCode,
        token: orderCode,
        number: orderCode,
        created: new Date().toISOString(),
        status: "PaymentSettled",
        total: { gross: { amount: 0, currency: "CAD" } },
        lines: [],
        shippingAddress: null,
        billingAddress: undefined,
      },
      confirmationNeeded: false,
      errors: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Customer auth & account (bearer token for headless storefront)
// ---------------------------------------------------------------------------

export type AuthTokenResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
};

const VENDURE_AUTH_HEADER = "vendure-auth-token";

/** Login via Shop API; returns token from response header for bearer auth */
export async function customerLogin(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const body = JSON.stringify({
    query: `
      mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
        login(username: $username, password: $password, rememberMe: $rememberMe) {
          ... on CurrentUser { id identifier }
          ... on InvalidCredentialsError { message errorCode }
          ... on ErrorResult { message errorCode }
        }
      }
    `,
    variables: { username: email.trim(), password, rememberMe: true },
  });
  try {
    const res = await fetch(shopApiUrl, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
      credentials: "include",
    });
    clearTimeout(timeoutId);
    const authToken = res.headers.get(VENDURE_AUTH_HEADER);
    const json = (await res.json()) as {
      data?: { login?: { id?: string; identifier?: string; message?: string } };
      errors?: { message: string }[];
    };
    if (json.errors?.length) {
      throw new Error(json.errors[0].message || "Login failed");
    }
    const login = json.data?.login;
    if (login && "message" in login && login.message) {
      throw new Error(login.message);
    }
    if (!authToken || !login?.id) {
      throw new Error("Login failed");
    }
    return {
      token: authToken,
      refreshToken: authToken,
      user: { id: login.id, email: (login.identifier as string) ?? email },
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) throw e;
    throw new Error("Login failed");
  }
}

/**
 * Login with the browser's Shop API session cookie so Vendure merges the guest cart into the account.
 * Server-side checkout must use this (not {@link customerLogin}) when "create account" is checked.
 */
export async function customerLoginWithCookies(
  email: string,
  password: string,
  cookieHeader: string
): Promise<AuthTokenResponse> {
  const trimmed = cookieHeader.trim();
  if (!trimmed) {
    throw new Error("Checkout session missing. Enable cookies, refresh the page, and try again.");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: trimmed,
  };
  const body = JSON.stringify({
    query: `
      mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
        login(username: $username, password: $password, rememberMe: $rememberMe) {
          ... on CurrentUser { id identifier }
          ... on InvalidCredentialsError { message errorCode }
          ... on ErrorResult { message errorCode }
        }
      }
    `,
    variables: { username: email.trim(), password, rememberMe: true },
  });
  try {
    const res = await fetch(shopApiUrl, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const authToken = res.headers.get(VENDURE_AUTH_HEADER);
    const json = (await res.json()) as {
      data?: { login?: { id?: string; identifier?: string; message?: string } };
      errors?: { message: string }[];
    };
    if (json.errors?.length) {
      throw new Error(json.errors[0].message || "Login failed");
    }
    const login = json.data?.login;
    if (login && "message" in login && login.message) {
      throw new Error(login.message);
    }
    if (!authToken || !login?.id) {
      throw new Error("Login failed");
    }
    return {
      token: authToken,
      refreshToken: authToken,
      user: { id: login.id, email: (login.identifier as string) ?? email },
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) throw e;
    throw new Error("Login failed");
  }
}

export async function customerRegister(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  redirectUrl?: string;
}): Promise<{ user?: StorefrontCustomer; errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    registerCustomerAccount: {
      success?: boolean;
      message?: string;
    };
  }>(`
    mutation RegisterCustomer($input: RegisterCustomerInput!) {
      registerCustomerAccount(input: $input) {
        ... on Success {
          success
        }
        ... on ErrorResult {
          message
          errorCode
        }
      }
    }
  `, {
    input: {
      emailAddress: params.email,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
    },
  });
  const result = (data as { registerCustomerAccount?: { success?: boolean; message?: string; errorCode?: string } }).registerCustomerAccount;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return {};
}

/** Resend verification email for an unverified customer (Shop API). */
export async function refreshCustomerVerification(emailAddress: string): Promise<{ ok: boolean; message?: string }> {
  const data = await fetchVendure<{
    refreshCustomerVerification: { __typename?: string; success?: boolean; message?: string };
  }>(
    `
    mutation RefreshCustomerVerification($email: String!) {
      refreshCustomerVerification(emailAddress: $email) {
        __typename
        ... on Success {
          success
        }
        ... on ErrorResult {
          message
        }
      }
    }
  `,
    { email: emailAddress }
  );
  const r = data.refreshCustomerVerification;
  if (r?.__typename === "Success" && r.success) {
    return { ok: true };
  }
  return { ok: false, message: r?.message };
}

export async function getCurrentCustomer(
  tokenOrCookie?: string
): Promise<StorefrontCustomer | null> {
  const opts = tokenOrCookie ? { authToken: tokenOrCookie } : undefined
  const data = await fetchVendure<{
    activeCustomer: {
      id: string;
      emailAddress?: string;
      firstName?: string;
      lastName?: string;
      createdAt?: string;
      addresses?: Array<{
        id: string;
        fullName?: string;
        streetLine1?: string;
        streetLine2?: string;
        city?: string;
        postalCode?: string;
        country?: string;
        province?: string;
        phoneNumber?: string;
        defaultShippingAddress?: boolean;
        defaultBillingAddress?: boolean;
      }>;
    } | null;
  }>(`
    query ActiveCustomer {
      activeCustomer {
        id
        emailAddress
        firstName
        lastName
        createdAt
        addresses {
          id
          fullName
          streetLine1
          streetLine2
          city
          postalCode
          country
          province
          phoneNumber
          defaultShippingAddress
          defaultBillingAddress
        }
      }
    }
  `, undefined, opts);
  const c = data.activeCustomer;
  if (!c) return null;
  const first = c.firstName ?? "";
  const last = c.lastName ?? "";
  return {
    id: c.id,
    email: c.emailAddress ?? "",
    firstName: c.firstName ?? first,
    lastName: c.lastName ?? last,
    isConfirmed: true,
    dateJoined: c.createdAt ?? "",
    addresses:
      c.addresses?.map((a) => {
        const [f = "", l = ""] = (a.fullName ?? "").split(" ");
        const code = (typeof a.country === "string" ? a.country : "").trim();
        return {
          id: a.id,
          firstName: f,
          lastName: l,
          streetAddress1: a.streetLine1 ?? "",
          streetLine2: a.streetLine2 ?? null,
          city: a.city ?? "",
          postalCode: a.postalCode ?? "",
          country: { code, country: code },
          countryArea: a.province ?? null,
          phone: a.phoneNumber ?? null,
          isDefaultShippingAddress: a.defaultShippingAddress ?? false,
          isDefaultBillingAddress: a.defaultBillingAddress ?? false,
        };
      }) ?? [],
  };
}

export async function accountAddressCreate(
  token: string,
  input: StorefrontAddressInput,
  _type?: "BILLING" | "SHIPPING"
): Promise<{ addressId?: string; errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    createCustomerAddress: {
      id?: string;
      message?: string;
    };
  }>(`
    mutation CreateCustomerAddress($input: CreateAddressInput!) {
      createCustomerAddress(input: $input) {
        id
        ... on ErrorResult { message errorCode }
      }
    }
  `, { input: toVendureAddress(input) }, { authToken: token });
  const result = (data as { createCustomerAddress?: { id?: string; message?: string } }).createCustomerAddress;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return { addressId: (result as { id?: string })?.id };
}

export async function accountAddressUpdate(
  token: string,
  addressId: string,
  input: StorefrontAddressInput
): Promise<{ errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    updateCustomerAddress: { message?: string };
  }>(`
    mutation UpdateCustomerAddress($id: ID!, $input: UpdateAddressInput!) {
      updateCustomerAddress(id: $id, input: $input) {
        ... on ErrorResult { message }
      }
    }
  `, { id: addressId, input: toVendureAddress(input) }, { authToken: token });
  const result = (data as { updateCustomerAddress?: { message?: string } }).updateCustomerAddress;
  if (result?.message) return { errors: [{ message: result.message }] };
  return {};
}

export async function accountAddressDelete(
  token: string,
  addressId: string
): Promise<{ errors?: { message: string }[] }> {
  const data = await fetchVendure<{
    deleteCustomerAddress: { success?: boolean; message?: string };
  }>(`
    mutation DeleteCustomerAddress($id: ID!) {
      deleteCustomerAddress(id: $id) {
        success
        ... on ErrorResult { message }
      }
    }
  `, { id: addressId }, { authToken: token });
  const result = (data as { deleteCustomerAddress?: { message?: string } }).deleteCustomerAddress;
  if (result?.message) return { errors: [{ message: result.message }] };
  return {};
}

export async function accountUpdate(
  token: string,
  input: { firstName: string; lastName: string }
): Promise<{ errors?: { message: string; field?: string }[] }> {
  // Shop API returns Customer (not Customer | ErrorResult) — do not spread ErrorResult here.
  try {
    await fetchVendure<{
      updateCustomer: { id: string; firstName?: string; lastName?: string };
    }>(
      `
    mutation UpdateCustomer($input: UpdateCustomerInput!) {
      updateCustomer(input: $input) {
        id
        firstName
        lastName
      }
    }
  `,
      { input },
      { authToken: token }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update profile";
    return { errors: [{ message }] };
  }
  return {};
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<AuthTokenResponse> {
  const customer = await getCurrentCustomer(refreshTokenValue);
  if (!customer) throw new Error("Token refresh failed");
  return {
    token: refreshTokenValue,
    refreshToken: refreshTokenValue,
    user: { id: customer.id, email: customer.email },
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Shop API Order fields needed by mapVendureOrderToOrder (also used after addPaymentToOrder). */
const shopOrderFieldsForStorefront = `
  id
  code
  createdAt
  state
  totalWithTax
  lines {
    id
    quantity
    unitPriceWithTax
    productVariant { product { name } name }
    featuredAsset { preview }
  }
  shippingAddress {
    fullName
    streetLine1
    streetLine2
    city
    postalCode
    country
    province
    phoneNumber
  }
`;

function mapVendureOrderToOrder(order: {
  id: string;
  code: string;
  createdAt: string;
  state: string;
  totalWithTax: number;
  lines?: Array<{
    id: string;
    productVariant: { product: { name: string }; name: string };
    quantity: number;
    unitPriceWithTax: number;
    featuredAsset?: { preview?: string } | null;
  }>;
  shippingAddress?: {
    fullName?: string;
    streetLine1?: string;
    streetLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    province?: string;
    phoneNumber?: string;
  } | null;
  billingAddress?: Record<string, unknown> | null;
}): StorefrontOrder {
  const currency = "CAD";
  const [first = "", last = ""] = (order.shippingAddress?.fullName ?? "").split(" ");
  return {
    id: order.id,
    token: order.code,
    number: order.code,
    created: order.createdAt,
    status: order.state,
    total: { gross: { amount: order.totalWithTax / 100, currency } },
    lines:
      order.lines?.map((l) => ({
        id: l.id,
        productName: l.productVariant?.product?.name ?? "",
        variantName: l.productVariant?.name ?? "",
        quantity: l.quantity,
        unitPrice: { gross: { amount: (l.unitPriceWithTax ?? 0) / 100, currency } },
        thumbnail: l.featuredAsset?.preview != null ? { url: l.featuredAsset.preview } : null,
      })) ?? [],
    shippingAddress: order.shippingAddress
      ? {
          firstName: first,
          lastName: last,
          streetAddress1: order.shippingAddress.streetLine1 ?? "",
          streetAddress2: order.shippingAddress.streetLine2 ?? null,
          city: order.shippingAddress.city ?? "",
          postalCode: order.shippingAddress.postalCode ?? "",
          country: (() => {
            const code = (order.shippingAddress.country ?? "").trim()
            return { code, country: code }
          })(),
          countryArea: order.shippingAddress.province ?? null,
          phone: order.shippingAddress.phoneNumber ?? null,
        }
      : null,
    billingAddress: undefined,
  };
}

async function getOrderByCode(code: string, opts?: VendureRequestOptions): Promise<{
  id: string;
  code: string;
  createdAt: string;
  state: string;
  totalWithTax: number;
  lines?: Array<{
    id: string;
    productVariant: { product: { name: string }; name: string };
    quantity: number;
    unitPriceWithTax: number;
    featuredAsset?: { preview?: string } | null;
  }>;
  shippingAddress?: {
    fullName?: string;
    streetLine1?: string;
    streetLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    province?: string;
    phoneNumber?: string;
  } | null;
} | null> {
  const data = await fetchVendure<{
    orderByCode: Parameters<typeof mapVendureOrderToOrder>[0] | null;
  }>(`
    query OrderByCode($code: String!) {
      orderByCode(code: $code) {
        id
        code
        createdAt
        state
        totalWithTax
        lines {
          id
          quantity
          unitPriceWithTax
          productVariant { product { name } name }
          featuredAsset { preview }
        }
        shippingAddress {
          fullName
          streetLine1
          streetLine2
          city
          postalCode
          country
          province
          phoneNumber
        }
      }
    }
  `, { code }, opts);
  return data.orderByCode as Parameters<typeof mapVendureOrderToOrder>[0] | null;
}

export async function getCustomerOrders(
  token: string,
  first: number = 20,
  after?: string
): Promise<{ orders: StorefrontOrder[]; hasNextPage: boolean; endCursor?: string }> {
  const empty = { orders: [] as StorefrontOrder[], hasNextPage: false, endCursor: "0" };
  try {
    const data = await fetchVendure<{
      activeCustomer: {
        orders: {
          items: Parameters<typeof mapVendureOrderToOrder>[0][];
          totalItems: number;
        };
      } | null;
    }>(`
    query CustomerOrders($take: Int!, $skip: Int!) {
      activeCustomer {
        orders(options: { take: $take, skip: $skip }) {
          items {
            id
            code
            createdAt
            state
            totalWithTax
            lines {
              id
              quantity
              unitPriceWithTax
              productVariant { product { name } name }
              featuredAsset { preview }
            }
            shippingAddress {
              fullName
              streetLine1
              streetLine2
              city
              postalCode
              country
              province
              phoneNumber
            }
          }
          totalItems
        }
      }
    }
  `, { take: first, skip: after ? parseInt(after, 10) : 0 }, { authToken: token });
    const items = data?.activeCustomer?.orders?.items;
    const list = Array.isArray(items) ? items : [];
    const totalItems = data?.activeCustomer?.orders?.totalItems ?? 0;
    return {
      orders: list.map(mapVendureOrderToOrder),
      hasNextPage: totalItems > first,
      endCursor: String(totalItems),
    };
  } catch (err) {
    console.error("[getCustomerOrders]", err);
    return empty;
  }
}

/** Get order by code (Vendure uses code; use this for confirmation and account order detail) */
export async function getOrderByToken(
  tokenOrCode: string,
  opts?: VendureRequestOptions
): Promise<StorefrontOrder | null> {
  const order = await getOrderByCode(tokenOrCode, opts);
  return order ? mapVendureOrderToOrder(order) : null;
}

export async function requestPasswordReset(
  email: string,
  _redirectUrl?: string
): Promise<{ errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    requestPasswordReset?: { success?: boolean; message?: string };
  }>(`
    mutation RequestPasswordReset($email: String!) {
      requestPasswordReset(emailAddress: $email) {
        ... on Success { success }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { email: email });
  const result = (data as { requestPasswordReset?: { message?: string } }).requestPasswordReset;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return {};
}

/** Set new password using the token from the reset email. */
export async function resetPassword(
  token: string,
  password: string
): Promise<{ errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    resetPassword?: { id?: string; identifier?: string; message?: string };
  }>(`
    mutation ResetPassword($token: String!, $password: String!) {
      resetPassword(token: $token, password: $password) {
        ... on CurrentUser { id identifier }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { token, password });
  const result = (data as { resetPassword?: { message?: string } }).resetPassword;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return {};
}

/** Verify customer email using the token from the confirmation email. */
export async function confirmAccount(
  _email: string,
  token: string
): Promise<{ user?: StorefrontCustomer; errors?: { message: string; field?: string }[] }> {
  if (!token?.trim()) {
    return { errors: [{ message: "Verification token is required." }] };
  }
  const data = await fetchVendure<{
    verifyCustomerAccount?: { id?: string; identifier?: string; message?: string };
  }>(`
    mutation VerifyCustomerAccount($token: String!) {
      verifyCustomerAccount(token: $token) {
        ... on CurrentUser { id identifier }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { token: token.trim() });
  const result = (data as { verifyCustomerAccount?: { message?: string } }).verifyCustomerAccount;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return {};
}
