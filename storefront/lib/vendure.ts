/**
 * Vendure Shop API client. Types represent the storefront’s domain model (orders, products, checkout, customer).
 */

import { giftSurchargeNetMajorFromInclusiveMinorCents } from "./checkout-gift-surcharge";

const shopApiUrl =
  process.env.VENDURE_SHOP_API_URL ||
  process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL ||
  "http://localhost:3000/shop-api";

const trimTrailingSlash = (s: string) => s.replace(/\/+$/, "");

/**
 * Vendure builds asset `preview` URLs from the Shop API request URL. In Docker the storefront
 * server often calls `VENDURE_SHOP_API_URL` (e.g. http://vendure:3000/shop-api), so GraphQL returns
 * `http://vendure:3000/assets/...` — the browser cannot load that hostname. Rewrite to the public origin.
 */
function rewriteVendureAssetUrlForBrowser(url: string): string {
  const publicBase =
    trimTrailingSlash(
      (process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || "")
        .trim()
        .replace(/\/shop-api\/?$/i, "")
    ) ||
    trimTrailingSlash((process.env.NEXT_PUBLIC_SITE_URL || "").trim());
  if (!publicBase) return url;

  const internalOriginFromEnv = (): string | null => {
    const raw = process.env.VENDURE_SHOP_API_URL?.trim();
    if (!raw) return null;
    try {
      const normalized = /\/shop-api\/?$/i.test(raw) ? raw : `${raw.replace(/\/$/, "")}/shop-api`;
      const u = new URL(normalized);
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  };

  const internalOrigin = internalOriginFromEnv();
  if (internalOrigin && url.startsWith(internalOrigin)) {
    return `${publicBase}${url.slice(internalOrigin.length)}`;
  }

  try {
    const u = new URL(url);
    if (u.hostname === "vendure") {
      return `${publicBase}${u.pathname}${u.search}`;
    }
    // Direct DigitalOcean Spaces URLs (S3 virtual-host style). Objects are often private; the browser
    // must load via Nginx → Vendure /assets/… so the server can use Spaces credentials.
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".digitaloceanspaces.com") || host.includes(".cdn.digitaloceanspaces.com")) {
      const p = u.pathname || "";
      if (p.startsWith("/assets/")) {
        return `${publicBase}${p}${u.search}`;
      }
      if (p.length > 1) {
        return `${publicBase}/assets${p}${u.search}`;
      }
    }
    // Previews often carry whatever host Vendure/Channel used (localhost, old domain, etc.).
    // Same-origin assets always live under /assets/ — force the browser-visible host from NEXT_PUBLIC_*.
    if (u.pathname.startsWith("/assets/")) {
      return `${publicBase}${u.pathname}${u.search}`;
    }
  } catch {
    /* not absolute */
  }

  if (url.startsWith("/assets/")) {
    return `${publicBase}${url}`;
  }

  return url;
}

/** In dev, Vendure EmailPlugin serves captured emails here. Use this to get verification/reset links. */
export function getVendureMailboxUrl(): string {
  const base = shopApiUrl.replace(/\/shop-api\/?$/, "");
  return `${base}/mailbox`;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

/** Browser and default server timeout (ms). Server API routes can raise via VENDURE_SERVER_FETCH_TIMEOUT_MS. */
function getVendureRequestTimeoutMs(): number {
  const raw = process.env.VENDURE_SERVER_FETCH_TIMEOUT_MS;
  if (raw == null || raw === "") return 10_000;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 10_000;
  return Math.min(120_000, Math.max(5_000, Math.floor(n)));
}

/** Pass when calling from server (e.g. API route) to authenticate with Vendure */
export type VendureRequestOptions = { cookie?: string; authToken?: string };

export async function fetchVendure<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { cookie?: string; authToken?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getVendureRequestTimeoutMs());

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
  /** Channel currency when present (avoids hard-coding CAD in summaries). */
  currencyCode?: string;
  email?: string | null;
  lines: {
    id: string;
    quantity: number;
    /** Line total ex. tax (OrderLine.discountedLinePrice). */
    lineTotalNet?: { amount: number; currency: string };
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
  /** Full order tax rows (Shop API), amounts in major units. */
  taxSummary?: {
    description: string;
    taxRate: number;
    taxBase: number;
    taxTotal: number;
  }[];
  /** Gift packaging surcharge from Order custom field (major units). */
  giftPackagingAmount?: number;
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
  currencyCode: string;
  /** Product lines + prorated discounts, excluding tax (matches Vendure `subTotal`). */
  subTotal: { net: { amount: number; currency: string } };
  /** Product lines subtotal including tax. */
  subTotalWithTax: { gross: { amount: number; currency: string } };
  /** Shipping ex tax. */
  shipping: { net: { amount: number; currency: string } };
  /** Shipping inc tax. */
  shippingWithTax: { gross: { amount: number; currency: string } };
  /** Tax rows from Vendure (rate, base, tax charged). */
  taxSummary: Array<{
    description: string;
    taxRate: number;
    taxBase: { amount: number; currency: string };
    taxTotal: { amount: number; currency: string };
  }>;
  /** Checkout gift add-on from order custom field (not always in line subtotals); same currency. */
  giftPackaging?: { amount: number; currency: string } | null;
  /** Parsed from settled payment metadata when present. */
  giftLineMessages: Array<{ unitKey: string; message: string }>;
  /** Total ex tax (subTotal + shipping + gift packaging in major units, approximate). */
  totalExTax: { amount: number; currency: string };
  total: { gross: { amount: number; currency: string } };
  amountPaid?: { amount: number; currency: string } | null;
  lines: {
    id: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    /** Unit prices (major units). */
    unitPrice: {
      net: { amount: number; currency: string };
      gross: { amount: number; currency: string };
    };
    /** Line total ex. tax (discountedLinePrice). */
    lineTotalNet: { amount: number; currency: string };
    /** Line total inc tax. */
    lineTotalWithTax: { amount: number; currency: string };
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

/** Raw Shop API order shape before {@link mapVendureOrderToOrder} (GraphQL `Money` = minor units). */
export type RawVendureOrderForStorefront = {
  id: string;
  code: string;
  createdAt: string;
  state: string;
  currencyCode?: string;
  subTotal?: unknown;
  subTotalWithTax?: unknown;
  shipping?: unknown;
  shippingWithTax?: unknown;
  total?: unknown;
  totalWithTax?: unknown;
  taxSummary?: Array<{
    description: string;
    taxRate: number;
    taxBase: unknown;
    taxTotal: unknown;
  }>;
  customFields?: { checkoutGiftSurchargeCents?: number | null } | null;
  payments?: Array<{
    state?: string;
    method?: string;
    amount?: unknown;
    metadata?: unknown;
  }>;
  lines?: Array<{
    id: string;
    productVariant: { product: { name: string }; name: string };
    quantity: number;
    unitPriceWithTax?: unknown;
    discountedUnitPrice?: unknown;
    discountedLinePrice?: unknown;
    discountedLinePriceWithTax?: unknown;
    linePriceWithTax?: unknown;
  }>;
  shippingAddress?: {
    fullName?: string | null;
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | { code?: string | null; name?: string | null } | null;
    province?: string | null;
    phoneNumber?: string | null;
  } | null;
  billingAddress?: {
    fullName?: string | null;
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | { code?: string | null; name?: string | null } | null;
    province?: string | null;
    phoneNumber?: string | null;
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
  assets {
    preview
  }
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
  assets?: Array<{ preview?: string | null } | null> | null;
}): StorefrontProduct {
  const amount = p.variants?.[0]?.price ?? 0;
  const currency = "CAD";
  const previewRaw =
    (p.featuredAsset?.preview && p.featuredAsset.preview.trim()) ||
    (p.assets ?? []).map((a) => a?.preview?.trim()).find(Boolean) ||
    "";
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? null,
    thumbnail: previewRaw
      ? { url: rewriteVendureAssetUrlForBrowser(previewRaw) }
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
        assets?: Array<{ preview?: string | null } | null> | null;
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

const DEFAULT_FEATURED_SNACK_BOXES_COLLECTION_SLUG = "featured-snack-boxes";

/** Slug of the Vendure collection whose products appear in the homepage “Snack box favorites” block. */
export function getHomeFeaturedCollectionSlug(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_FEATURED_COLLECTION_SLUG?.trim() ||
    process.env.STOREFRONT_FEATURED_COLLECTION_SLUG?.trim();
  return fromEnv || DEFAULT_FEATURED_SNACK_BOXES_COLLECTION_SLUG;
}

/**
 * Products belonging to a shop collection (by slug), in collection order.
 * Dedupes by product id when multiple variants from the same product appear in the list.
 */
export async function listProductsInCollectionBySlug(
  slug: string
): Promise<StorefrontProduct[]> {
  const trimmed = slug.trim();
  if (!trimmed) return [];

  type ProductRow = Parameters<typeof mapVendureProductToStorefront>[0];

  const data = await fetchVendure<{
    collection: {
      productVariants: {
        items: Array<{ product: ProductRow | null }>;
      };
    } | null;
  }>(
    `
    query CollectionProductsBySlug($slug: String!) {
      collection(slug: $slug) {
        productVariants(options: { take: 100 }) {
          items {
            product {
              ${productFields}
            }
          }
        }
      }
    }
  `,
    { slug: trimmed }
  );

  if (!data.collection) return [];

  const rows = data.collection.productVariants?.items ?? [];
  const seen = new Set<string>();
  const out: StorefrontProduct[] = [];

  for (const row of rows) {
    const p = row.product;
    if (!p || seen.has(p.id)) continue;
    if (!isCatalogProduct(p)) continue;
    seen.add(p.id);
    out.push(mapVendureProductToStorefront(p));
  }

  return out;
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
      assets?: Array<{ preview?: string | null } | null> | null;
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
  currencyCode
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
  taxSummary {
    description
    taxRate
    taxBase
    taxTotal
  }
  customFields {
    checkoutGiftSurchargeCents
  }
`;

function mapVendureOrderToCheckout(order: {
  id: string;
  code: string;
  currencyCode?: string | null;
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
  taxSummary?: Array<{
    description?: string | null;
    taxRate?: number | null;
    taxBase?: unknown;
    taxTotal?: unknown;
  }> | null;
  customFields?: { checkoutGiftSurchargeCents?: number | null } | null;
} | null): StorefrontCheckout | null {
  if (!order) return null;
  const currency = storefrontDisplayCurrency(
    typeof order.currencyCode === "string" ? order.currencyCode : null,
  );
  const minor = (v: unknown): number => {
    if (v == null) return 0;
    if (typeof v === "bigint") return Number(v) / 100;
    if (typeof v === "number" && Number.isFinite(v)) return v / 100;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n / 100 : 0;
    }
    return 0;
  };
  const giftCents = order.customFields?.checkoutGiftSurchargeCents;
  const giftMajor =
    typeof giftCents === "number" && Number.isFinite(giftCents) && giftCents > 0
      ? giftCents / 100
      : undefined;
  return {
    id: order.id,
    code: order.code,
    currencyCode: currency,
    email: undefined,
    lines:
      order.lines?.map((line) => ({
        id: line.id,
        quantity: line.quantity,
        lineTotalNet: {
          amount: line.discountedLinePrice / 100,
          currency,
        },
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
              return asset?.preview != null
                ? { url: rewriteVendureAssetUrlForBrowser(asset.preview) }
                : null;
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
            ? [{ url: rewriteVendureAssetUrlForBrowser(line.productVariant.featuredAsset.preview) }]
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
    taxSummary: order.taxSummary?.length
      ? order.taxSummary.map((row) => ({
          description: row?.description ?? "",
          taxRate: row?.taxRate ?? 0,
          taxBase: minor(row?.taxBase),
          taxTotal: minor(row?.taxTotal),
        }))
      : undefined,
    giftPackagingAmount: giftMajor,
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

/** Minimal active order info for checkout branching (e.g. Stripe retry while already ArrangingPayment). */
export async function getShopActiveOrderSnapshot(
  opts?: VendureRequestOptions
): Promise<{ state: string; code: string } | null> {
  const data = await fetchVendure<{
    activeOrder: { state: string; code: string } | null;
  }>(
    `
    query ShopActiveOrderSnapshot {
      activeOrder {
        state
        code
      }
    }
  `,
    undefined,
    opts
  );
  const o = data.activeOrder;
  if (!o) return null;
  return { state: o.state, code: o.code };
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

/** Vendure default order process blocks ArrangingPayment without Customer + at least one shipping line. */
export async function assertActiveOrderReadyForArrangingPayment(
  opts?: VendureRequestOptions
): Promise<void> {
  const data = await fetchVendure<{
    activeOrder: {
      customer?: { id: string } | null;
      shippingLines?: { id: string }[] | null;
    } | null;
  }>(
    `
    query ActiveOrderArrangingPaymentPrereqs {
      activeOrder {
        customer { id }
        shippingLines { id }
      }
    }
  `,
    undefined,
    opts
  );
  const o = data.activeOrder;
  if (!o) {
    throw new Error("No active order");
  }
  if (!o.customer?.id) {
    throw new Error(
      "Your order has no customer on the server (Vendure requires this before payment). Try signing out and checking out again, or complete checkout with your email as a guest."
    );
  }
  const n = o.shippingLines?.length ?? 0;
  if (n === 0) {
    throw new Error(
      "No shipping method is set on your order. Confirm your shipping address and that a shipping method is available, then try again."
    );
  }
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
  await ensureActiveOrderAllowsCartLineEdits(opts);
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
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order after add");
  return order;
}

export async function checkoutLinesAdd(
  _checkoutId: string,
  lines: { variantId: string; quantity: number }[],
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  for (const line of lines) {
    await addItemToOrder(line.variantId, line.quantity, opts);
  }
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutLineUpdate(
  _checkoutId: string,
  lineId: string,
  quantity: number,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  await ensureActiveOrderAllowsCartLineEdits(opts);
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
  `, { orderLineId: lineId, quantity }, opts);
  const result = (data as { adjustOrderLine?: unknown }).adjustOrderLine;
  if (result && typeof result === "object" && "errorCode" in result) {
    throw new Error((result as { message?: string }).message || "Failed to update line");
  }
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutLineDelete(
  _checkoutId: string,
  lineId: string,
  opts?: VendureRequestOptions
): Promise<StorefrontCheckout> {
  await ensureActiveOrderAllowsCartLineEdits(opts);
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
  `, { orderLineId: lineId }, opts);
  const result = (data as { removeOrderLine?: unknown }).removeOrderLine;
  if (result && typeof result === "object" && "errorCode" in result) {
    throw new Error((result as { message?: string }).message || "Failed to remove line");
  }
  const order = await getActiveOrder(opts);
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

function buildCreateCustomerAddressInput(
  addr: StorefrontAddressInput,
  options?: { defaultShippingAddress?: boolean; defaultBillingAddress?: boolean },
): ReturnType<typeof toVendureAddress> & {
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
} {
  const base = toVendureAddress(addr);
  return {
    ...base,
    ...(options?.defaultShippingAddress ? { defaultShippingAddress: true } : {}),
    ...(options?.defaultBillingAddress ? { defaultBillingAddress: true } : {}),
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

/**
 * `removeOrderLine` / `adjustOrderLine` / `addItemToOrder` require `AddingItems` or `Draft`.
 * After starting Stripe checkout the active order can sit in `ArrangingPayment`, so the shopper
 * cannot change quantities or remove lines until we move back to `AddingItems` (allowed by the
 * default order process).
 */
async function ensureActiveOrderAllowsCartLineEdits(opts?: VendureRequestOptions): Promise<void> {
  const data = await fetchVendure<{
    activeOrder: { state: string } | null;
  }>(
    `
    query ActiveOrderStateForCart {
      activeOrder { state }
    }
  `,
    undefined,
    opts
  );
  const state = data.activeOrder?.state;
  if (state !== "ArrangingPayment") return;
  await shopTransitionOrderToState("AddingItems", opts);
}

export async function checkoutEmailUpdate(
  _checkoutId: string,
  email: string,
  opts?: VendureRequestOptions,
  firstName?: string,
  lastName?: string
): Promise<StorefrontCheckout> {
  const data = await fetchVendure<{
    setCustomerForOrder:
      | { id?: string; customer?: { id?: string } | null; message?: string; errorCode?: string }
      | null;
  }>(
    `
    mutation SetCustomerForOrder($input: CreateCustomerInput!) {
      setCustomerForOrder(input: $input) {
        ... on Order { id customer { id } }
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
  const payload = data.setCustomerForOrder;
  assertShopOrderMutationPayload(payload, "Set customer for order");
  const custId =
    payload && typeof payload === "object" && "customer" in payload
      ? payload.customer?.id
      : undefined;
  if (!custId) {
    throw new Error(
      "Set customer for order succeeded but the order has no linked customer. Check Vendure GuestCheckoutStrategy (use LinkGuestCheckoutStrategy) and shop session cookies."
    );
  }
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
    activeOrder: { state: string } | null;
    /** Shop API: top-level Query field, not Order.nextOrderStates */
    nextOrderStates: string[];
  }>(
    `query ActiveOrderCheckoutState {
      activeOrder {
        state
      }
      nextOrderStates
    }`,
    undefined,
    opts
  );
  const active = snap.activeOrder;
  if (!active) {
    throw new Error("No active order");
  }

  let state = active.state;
  let nextStates = snap.nextOrderStates ?? [];

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
      activeOrder: { state: string } | null;
      nextOrderStates: string[];
    }>(
      `query ActiveOrderCheckoutState2 {
        activeOrder { state }
        nextOrderStates
      }`,
      undefined,
      opts
    );
    state = again.activeOrder?.state ?? state;
    nextStates = again.nextOrderStates ?? [];
  }

  if (!nextStates.includes("ArrangingPayment")) {
    throw new Error(
      `Cannot move order to payment from state "${state}". Server allows: ${nextStates.length ? nextStates.join(", ") : "(none)"}. ` +
        "If you are logged in, try guest checkout or ask an admin to review the Customer role (Owner permission can block shop transitions)."
    );
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
      addPaymentToOrder?: RawVendureOrderForStorefront & {
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
      const mapped = mapVendureOrderToOrder(raw as RawVendureOrderForStorefront);
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
    const currency = "CAD";
    return {
      order: {
        id: orderCode,
        token: orderCode,
        number: orderCode,
        created: new Date().toISOString(),
        status: "PaymentSettled",
        currencyCode: currency,
        subTotal: { net: { amount: 0, currency } },
        subTotalWithTax: { gross: { amount: 0, currency } },
        shipping: { net: { amount: 0, currency } },
        shippingWithTax: { gross: { amount: 0, currency } },
        taxSummary: [],
        giftPackaging: null,
        giftLineMessages: [],
        totalExTax: { amount: 0, currency },
        total: { gross: { amount: 0, currency } },
        amountPaid: null,
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
  const timeoutId = setTimeout(() => controller.abort(), getVendureRequestTimeoutMs());
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
  const timeoutId = setTimeout(() => controller.abort(), getVendureRequestTimeoutMs());
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
        country?: string | null;
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
        const { code, label } = vendureGraphqlCountryToStorefront(a.country);
        return {
          id: a.id,
          firstName: f,
          lastName: l,
          streetAddress1: a.streetLine1 ?? "",
          streetLine2: a.streetLine2 ?? null,
          city: a.city ?? "",
          postalCode: a.postalCode ?? "",
          country: { code, country: label || code },
          countryArea: a.province ?? null,
          phone: a.phoneNumber ?? null,
          isDefaultShippingAddress: a.defaultShippingAddress ?? false,
          isDefaultBillingAddress: a.defaultBillingAddress ?? false,
        };
      }) ?? [],
  };
}

export type AccountAddressCreateOptions = {
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
};

export async function accountAddressCreate(
  token: string,
  input: StorefrontAddressInput,
  options?: AccountAddressCreateOptions
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
  `, { input: buildCreateCustomerAddressInput(input, options) }, { authToken: token });
  const result = (data as { createCustomerAddress?: { id?: string; message?: string } }).createCustomerAddress;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return { addressId: (result as { id?: string })?.id };
}

function isCompleteStorefrontAddress(a: StorefrontAddressInput): boolean {
  return Boolean(
    a.firstName?.trim() &&
      a.lastName?.trim() &&
      a.streetAddress1?.trim() &&
      a.city?.trim() &&
      a.postalCode?.trim() &&
      a.country?.trim(),
  );
}

function storefrontAddressSignature(a: StorefrontAddressInput): string {
  const n = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const pc = n(a.postalCode).replace(/\s/g, "");
  return [
    n(a.firstName),
    n(a.lastName),
    n(a.streetAddress1),
    n(a.streetAddress2 ?? ""),
    n(a.city),
    pc,
    n(a.countryArea ?? ""),
    n(a.country),
  ].join("\u0001");
}

function signatureFromCustomerAddress(addr: NonNullable<StorefrontCustomer["addresses"]>[number]): string {
  return storefrontAddressSignature({
    firstName: addr.firstName,
    lastName: addr.lastName,
    streetAddress1: addr.streetAddress1,
    streetAddress2: addr.streetAddress2 ?? null,
    city: addr.city,
    postalCode: addr.postalCode,
    country: addr.country.code,
    countryArea: addr.countryArea ?? null,
    phone: addr.phone ?? null,
  });
}

/**
 * Persist checkout billing/shipping on the Customer profile (Shop API) when authenticated.
 * Skips duplicates; sets defaults only when the customer has no default for that role yet.
 * Never throws — logs failures so checkout can continue.
 */
export async function syncCheckoutAddressesToCustomerProfile(
  token: string,
  billing: StorefrontAddressInput,
  shipping: StorefrontAddressInput,
): Promise<void> {
  if (!token?.trim()) return;
  if (!isCompleteStorefrontAddress(billing) || !isCompleteStorefrontAddress(shipping)) return;
  try {
    const customer = await getCurrentCustomer(token);
    if (!customer) return;
    const existing = customer.addresses ?? [];
    const existingSigs = new Set(existing.map(signatureFromCustomerAddress));
    const hasDefShip = existing.some((x) => x.isDefaultShippingAddress);
    const hasDefBill = existing.some((x) => x.isDefaultBillingAddress);
    const billSig = storefrontAddressSignature(billing);
    const shipSig = storefrontAddressSignature(shipping);

    if (billSig === shipSig) {
      if (!existingSigs.has(billSig)) {
        const r = await accountAddressCreate(token, billing, {
          defaultShippingAddress: !hasDefShip,
          defaultBillingAddress: !hasDefBill,
        });
        if (r.errors?.length) console.error("[syncCheckoutAddressesToCustomerProfile]", r.errors);
      }
      return;
    }

    if (!existingSigs.has(billSig)) {
      const r = await accountAddressCreate(token, billing, {
        defaultBillingAddress: !hasDefBill,
      });
      if (r.errors?.length) console.error("[syncCheckoutAddressesToCustomerProfile] billing", r.errors);
      existingSigs.add(billSig);
    }
    if (!existingSigs.has(shipSig)) {
      const r = await accountAddressCreate(token, shipping, {
        defaultShippingAddress: !hasDefShip,
      });
      if (r.errors?.length) console.error("[syncCheckoutAddressesToCustomerProfile] shipping", r.errors);
    }
  } catch (e) {
    console.error("[syncCheckoutAddressesToCustomerProfile]", e);
  }
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

/**
 * Currency shown on the storefront (confirmation, cart-derived summaries).
 * Vendure channels sometimes report `USD` while prices are Canadian — normalize to CAD.
 * Set `NEXT_PUBLIC_STORE_CURRENCY` (ISO 4217) to override.
 */
export function storefrontDisplayCurrency(iso: string | undefined | null): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_STORE_CURRENCY?.trim().toUpperCase()
      : "";
  if (fromEnv && /^[A-Z]{3}$/.test(fromEnv)) return fromEnv;
  const c = (iso ?? "").trim().toUpperCase();
  if (c === "USD") return "CAD";
  return c || "CAD";
}

/** Money fields are GraphQL `Money` scalars (minor units as number). */
function moneyToMajor(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "bigint") return Number(val) / 100;
  if (typeof val === "number" && Number.isFinite(val)) return val / 100;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    return Number.isFinite(n) ? n / 100 : 0;
  }
  return 0;
}

function parseGiftFromPaymentMetadata(payments: unknown): { unitKey: string; message: string }[] {
  if (!Array.isArray(payments)) return [];
  const out: { unitKey: string; message: string }[] = [];
  for (const p of payments) {
    if (!p || typeof p !== "object") continue;
    const st = (p as { state?: string }).state;
    if (st !== "Settled" && st !== "Authorized") continue;
    const meta = (p as { metadata?: unknown }).metadata;
    let raw: string | undefined;
    if (meta && typeof meta === "object" && "gift_by_line_unit_json" in meta) {
      const v = (meta as Record<string, unknown>).gift_by_line_unit_json;
      if (typeof v === "string") raw = v;
    }
    if (!raw?.trim()) continue;
    try {
      const obj = JSON.parse(raw) as Record<string, { giftMessage?: string }>;
      for (const [key, v] of Object.entries(obj)) {
        const msg = v?.giftMessage?.trim();
        if (msg) out.push({ unitKey: key, message: msg });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** Shop API `Address.country` is a string (ISO code); older schemas may return `{ code, name }`. */
function vendureGraphqlCountryToStorefront(country: unknown): { code: string; label: string } {
  if (country == null) return { code: "", label: "" };
  if (typeof country === "string") {
    const c = country.trim();
    return { code: c, label: c };
  }
  if (typeof country === "object" && country !== null && "code" in country) {
    const o = country as { code?: string | null; name?: string | null };
    const code = String(o.code ?? "").trim();
    const name = String(o.name ?? "").trim();
    return { code, label: name || code };
  }
  return { code: "", label: "" };
}

function mapVendureAddressToStorefront(
  addr:
    | {
        fullName?: string | null;
        streetLine1?: string | null;
        streetLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | { code?: string | null; name?: string | null } | null;
        province?: string | null;
        phoneNumber?: string | null;
      }
    | null
    | undefined
): StorefrontOrder["shippingAddress"] {
  if (!addr) return null;
  const parts = (addr.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const { code, label } = vendureGraphqlCountryToStorefront(addr.country);
  return {
    firstName: first,
    lastName: last,
    streetAddress1: addr.streetLine1 ?? "",
    streetAddress2: addr.streetLine2 ?? null,
    city: addr.city ?? "",
    postalCode: addr.postalCode ?? "",
    country: { code, country: label || code },
    countryArea: addr.province ?? null,
    phone: addr.phoneNumber ?? null,
  };
}

/** Shop API Order fields for confirmation / checkout complete mapping. */
const shopOrderFieldsForStorefront = `
  id
  code
  createdAt
  state
  currencyCode
  subTotal
  subTotalWithTax
  shipping
  shippingWithTax
  total
  totalWithTax
  taxSummary {
    description
    taxRate
    taxBase
    taxTotal
  }
  customFields {
    checkoutGiftSurchargeCents
  }
  payments {
    state
    method
    amount
    metadata
  }
  lines {
    id
    quantity
    unitPriceWithTax
    discountedUnitPrice
    discountedLinePrice
    discountedLinePriceWithTax
    linePriceWithTax
    productVariant { product { name } name }
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
  billingAddress {
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

function mapVendureOrderToOrder(order: RawVendureOrderForStorefront): StorefrontOrder {
  const currency = storefrontDisplayCurrency(order.currencyCode as string);
  const subNet = moneyToMajor(order.subTotal);
  const subGross = moneyToMajor(order.subTotalWithTax);
  const shipNet = moneyToMajor(order.shipping);
  const shipGross = moneyToMajor(order.shippingWithTax);
  const totalGross = moneyToMajor(order.totalWithTax);
  const giftCentsRaw = order.customFields?.checkoutGiftSurchargeCents;
  const shipForGift = order.shippingAddress;
  const giftCountry = vendureGraphqlCountryToStorefront(shipForGift?.country).code || "CA";
  const giftProvince = (shipForGift?.province ?? "").toString();
  const giftNetMajor =
    typeof giftCentsRaw === "number" && Number.isFinite(giftCentsRaw) && giftCentsRaw > 0
      ? giftSurchargeNetMajorFromInclusiveMinorCents(giftCentsRaw, giftCountry, giftProvince)
      : 0;
  const giftPackaging =
    giftNetMajor > 0 ? { amount: giftNetMajor, currency } : null;

  const taxSummary =
    order.taxSummary?.map((row) => ({
      description: row.description ?? "",
      taxRate: row.taxRate ?? 0,
      taxBase: { amount: moneyToMajor(row.taxBase), currency },
      taxTotal: { amount: moneyToMajor(row.taxTotal), currency },
    })) ?? [];

  let settledPaymentTotal = 0;
  if (Array.isArray(order.payments)) {
    for (const p of order.payments) {
      if (p?.state === "Settled") {
        settledPaymentTotal += moneyToMajor(p.amount);
      }
    }
  }
  const amountPaid =
    settledPaymentTotal > 0 ? { amount: settledPaymentTotal, currency } : null;

  const linesRaw = order.lines ?? [];
  const sumLineGross = linesRaw.reduce(
    (s, x) => s + moneyToMajor(x.discountedLinePriceWithTax ?? x.linePriceWithTax),
    0,
  );
  const lines = linesRaw.map((l) => {
    const lineGross = moneyToMajor(l.discountedLinePriceWithTax ?? l.linePriceWithTax);
    let lineNet = moneyToMajor(l.discountedLinePrice ?? 0);
    const unitGross = moneyToMajor(l.unitPriceWithTax);
    const unitNet = moneyToMajor(l.discountedUnitPrice ?? 0);
    const lineTotal =
      lineGross > 0 ? lineGross : (unitGross > 0 ? unitGross * l.quantity : 0);
    if (lineNet <= 0 && unitNet > 0) {
      lineNet = unitNet * l.quantity;
    }
    if (lineNet <= 0 && lineGross > 0 && sumLineGross > 0 && subNet > 0) {
      lineNet = (lineGross / sumLineGross) * subNet;
    }
    if (lineNet <= 0 && lineGross > 0) {
      lineNet = lineGross;
    }
    const q = Math.max(1, l.quantity);
    return {
      id: l.id,
      productName: l.productVariant?.product?.name ?? "",
      variantName: l.productVariant?.name ?? "",
      quantity: l.quantity,
      unitPrice: {
        net: { amount: unitNet > 0 ? unitNet : lineNet / q, currency },
        gross: { amount: unitGross > 0 ? unitGross : lineTotal / q, currency },
      },
      lineTotalNet: { amount: lineNet, currency },
      lineTotalWithTax: { amount: lineTotal, currency },
      thumbnail: null,
    };
  });

  const totalExTaxAmount = subNet + shipNet + giftNetMajor;

  return {
    id: order.id,
    token: order.code,
    number: order.code,
    created: order.createdAt,
    status: order.state,
    currencyCode: currency,
    subTotal: { net: { amount: subNet, currency } },
    subTotalWithTax: { gross: { amount: subGross, currency } },
    shipping: { net: { amount: shipNet, currency } },
    shippingWithTax: { gross: { amount: shipGross, currency } },
    taxSummary,
    giftPackaging,
    giftLineMessages: parseGiftFromPaymentMetadata(order.payments),
    totalExTax: { amount: totalExTaxAmount, currency },
    total: { gross: { amount: totalGross, currency } },
    amountPaid,
    lines,
    shippingAddress: mapVendureAddressToStorefront(order.shippingAddress),
    billingAddress: mapVendureAddressToStorefront(order.billingAddress) || undefined,
  };
}

async function getOrderByCode(
  code: string,
  opts?: VendureRequestOptions
): Promise<RawVendureOrderForStorefront | null> {
  const data = await fetchVendure<{
    orderByCode: RawVendureOrderForStorefront | null;
  }>(
    `
    query OrderByCode($code: String!) {
      orderByCode(code: $code) {
        ${shopOrderFieldsForStorefront}
      }
    }
  `,
    { code },
    opts
  );
  return data.orderByCode;
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
          items: RawVendureOrderForStorefront[];
          totalItems: number;
        };
      } | null;
    }>(`
    query CustomerOrders($take: Int!, $skip: Int!) {
      activeCustomer {
        orders(options: { take: $take, skip: $skip }) {
          items {
            ${shopOrderFieldsForStorefront}
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
