/**
 * Vendure Shop API client. Replaces Saleor; types and function names are kept
 * compatible where possible so the rest of the storefront can switch with minimal changes.
 */

const shopApiUrl =
  process.env.VENDURE_SHOP_API_URL ||
  process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL ||
  "http://localhost:3000/shop-api";

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const REQUEST_TIMEOUT_MS = 10_000;

/** Pass when calling from server (e.g. API route) to forward the request cookie to Vendure */
export type VendureRequestOptions = { cookie?: string };

export async function fetchVendure<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { cookie?: string }
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
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

// ---------------------------------------------------------------------------
// Types (compatible with existing Saleor type names for minimal storefront changes)
// ---------------------------------------------------------------------------

export type SaleorVariantAttribute = {
  attribute: { name: string };
  values: { name: string }[];
};

export type SaleorProductVariant = {
  id: string;
  name: string;
  pricing?: { price?: { gross?: { amount: number; currency: string } } };
  attributes?: SaleorVariantAttribute[];
  quantityAvailable?: number;
};

export type SaleorProduct = {
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
  variants?: SaleorProductVariant[];
};

export type SaleorCheckout = {
  id: string;
  email?: string | null;
  lines: {
    id: string;
    quantity: number;
    totalPrice?: { gross?: { amount: number; currency: string } };
    variant: {
      id: string;
      name: string;
      product: { name: string; thumbnail?: { url: string | null } | null };
      pricing?: { price?: { gross?: { amount: number; currency: string } } };
      media?: { url: string }[];
    };
  }[];
  subtotalPrice?: { gross?: { amount: number; currency: string } };
  totalPrice?: { gross?: { amount: number; currency: string } };
  shippingPrice?: { gross?: { amount: number; currency: string } };
};

export type SaleorAddressInput = {
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

export type SaleorCustomer = {
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

export type SaleorOrder = {
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
  order: SaleorOrder | null;
  confirmationNeeded: boolean;
  confirmationData?: string | null;
  errors: { message?: string }[];
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

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
  }
`;

function mapVendureProductToSaleor(p: {
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
  }>;
}): SaleorProduct {
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
      })) ?? [],
  };
}

export async function listProducts(): Promise<SaleorProduct[]> {
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
  const items = data.products?.items ?? [];
  return items.map(mapVendureProductToSaleor);
}

export async function getProductByHandle(
  slug: string
): Promise<SaleorProduct | null> {
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
        options?: Array<{ name: string; group?: { name: string }; code: string }>;
      }>;
    } | null;
  }>(`
    query ProductBySlug($slug: String!) {
      product(slug: $slug) {
        ${productFields}
        variants {
          id
          name
          price
          priceWithTax
          stockLevel
          options { name group { name } code }
        }
      }
    }
  `, { slug });
  if (!data.product) return null;
  const p = data.product as Parameters<typeof mapVendureProductToSaleor>[0];
  return mapVendureProductToSaleor(p);
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
  subTotalWithTax
  shippingWithTax
  totalWithTax
`;

function mapVendureOrderToSaleorCheckout(order: {
  id: string;
  code: string;
  lines?: Array<{
    id: string;
    quantity: number;
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
  subTotalWithTax?: number;
  shippingWithTax?: number;
  totalWithTax?: number;
} | null): SaleorCheckout | null {
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
            amount: line.linePriceWithTax / 100,
            currency,
          },
        },
        variant: {
          id: line.productVariant.id,
          name: line.productVariant.name,
          product: {
            name: line.productVariant.product.name,
            thumbnail: line.productVariant.product.featuredAsset ?? line.productVariant.featuredAsset ?? null,
          },
          pricing: {
            price: {
              gross: {
                amount: line.productVariant.priceWithTax / 100,
                currency,
              },
            },
          },
          media: line.productVariant.featuredAsset?.preview
            ? [{ url: line.productVariant.featuredAsset.preview }]
            : undefined,
        },
      })) ?? [],
    subtotalPrice: order.subTotalWithTax != null ? { gross: { amount: order.subTotalWithTax / 100, currency } } : undefined,
    shippingPrice: order.shippingWithTax != null ? { gross: { amount: order.shippingWithTax / 100, currency } } : undefined,
    totalPrice: order.totalWithTax != null ? { gross: { amount: order.totalWithTax / 100, currency } } : undefined,
  };
}

export async function getActiveOrder(opts?: VendureRequestOptions): Promise<SaleorCheckout | null> {
  const data = await fetchVendure<{
    activeOrder: Parameters<typeof mapVendureOrderToSaleorCheckout>[0];
  }>(`
    query ActiveOrder {
      activeOrder {
        ${activeOrderFragment}
      }
    }
  `, undefined, opts);
  return mapVendureOrderToSaleorCheckout(data.activeOrder);
}

/** For compatibility: in Vendure we use session; id is ignored and we return activeOrder */
export async function getCheckout(
  _id: string
): Promise<SaleorCheckout | null> {
  return getActiveOrder();
}

/** Create order by adding lines; in Vendure the first addItemToOrder creates the order */
export async function createCheckout(params: {
  email?: string;
  lines: { variantId: string; quantity: number }[];
}): Promise<SaleorCheckout> {
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
    `, { variantId: line.variantId, quantity: line.quantity });
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
  quantity: number
): Promise<SaleorCheckout> {
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
  `, { variantId, quantity });
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
): Promise<SaleorCheckout> {
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
): Promise<SaleorCheckout> {
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
): Promise<SaleorCheckout> {
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

function toVendureAddress(addr: SaleorAddressInput) {
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

export async function checkoutEmailUpdate(
  _checkoutId: string,
  email: string,
  opts?: VendureRequestOptions
): Promise<SaleorCheckout> {
  await fetchVendure(`
    mutation SetOrderCustomer($input: CreateCustomerInput!) {
      setOrderCustomer(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { input: { emailAddress: email } }, opts);
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutShippingAddressUpdate(
  _checkoutId: string,
  address: SaleorAddressInput,
  opts?: VendureRequestOptions
): Promise<SaleorCheckout> {
  await fetchVendure(`
    mutation SetOrderShippingAddress($input: CreateAddressInput!) {
      setOrderShippingAddress(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { input: toVendureAddress(address) }, opts);
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutBillingAddressUpdate(
  _checkoutId: string,
  address: SaleorAddressInput,
  opts?: VendureRequestOptions
): Promise<SaleorCheckout> {
  await fetchVendure(`
    mutation SetOrderBillingAddress($input: CreateAddressInput!) {
      setOrderBillingAddress(input: $input) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { input: toVendureAddress(address) }, opts);
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
}

export async function checkoutCustomerAttach(
  _checkoutId: string,
  _authToken: string,
  opts?: VendureRequestOptions
): Promise<SaleorCheckout> {
  return getActiveOrder(opts) as Promise<SaleorCheckout>;
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
): Promise<SaleorCheckout> {
  await fetchVendure(`
    mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
      setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
        ... on Order { id }
        ... on ErrorResult { message errorCode }
      }
    }
  `, { shippingMethodId: [deliveryMethodId] }, opts);
  const order = await getActiveOrder(opts);
  if (!order) throw new Error("No active order");
  return order;
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
  const method = "dummy-payment-method";
  let orderCode: string | null = null;
  try {
    const paymentResult = await fetchVendure<{
      addPaymentToOrder?: { __typename: string; code?: string; id?: string } & Record<string, unknown>;
    }>(`
      mutation AddPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
          ... on Order { id code state }
          ... on ErrorResult { message errorCode }
          ... on PaymentFailedError { message }
          ... on PaymentDeclinedError { message }
        }
      }
    `, {
      input: {
        method,
        metadata: options?.metadata?.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {}) ?? {},
      },
    }, opts);
    const order = (paymentResult as { addPaymentToOrder?: { code?: string } }).addPaymentToOrder;
    if (order && typeof order === "object" && "code" in order) {
      orderCode = order.code ?? null;
    }
  } catch (e) {
    return {
      order: null,
      confirmationNeeded: false,
      errors: [{ message: e instanceof Error ? e.message : "Payment failed" }],
    };
  }
  if (!orderCode) {
    const orderData = await fetchVendure<{
      activeOrder: { code: string } | null;
    }>(`query { activeOrder { code } }`, undefined, opts);
    orderCode = orderData.activeOrder?.code ?? null;
  }
  if (!orderCode) {
    return {
      order: null,
      confirmationNeeded: false,
      errors: [{ message: "Could not get order after payment" }],
    };
  }
  const fullOrder = await getOrderByCode(orderCode, opts);
  return {
    order: fullOrder ? mapVendureOrderToSaleorOrder(fullOrder) : null,
    confirmationNeeded: false,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Customer auth & account (Vendure uses session cookies)
// ---------------------------------------------------------------------------

export type AuthTokenResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
};

export async function customerLogin(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const data = await fetchVendure<{
    authenticate: {
      success?: boolean;
      token?: string;
      id?: string;
      identifier?: string;
    };
  }>(`
    mutation Authenticate($input: NativeAuthInput!) {
      authenticate(input: $input) {
        ... on Success {
          success
        }
        ... on CurrentUser {
          id
          identifier
        }
      }
    }
  `, { input: { username: email, password } });
  const auth = (data as { authenticate?: { success?: boolean; token?: string; id?: string; identifier?: string } }).authenticate;
  if (!auth?.success && !auth?.id) {
    throw new Error("Login failed");
  }
  return {
    token: auth.token ?? "session",
    refreshToken: "session",
    user: { id: auth.id ?? "", email: auth.identifier ?? email },
  };
}

export async function customerRegister(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  redirectUrl?: string;
}): Promise<{ user?: SaleorCustomer; errors?: { message: string; field?: string }[] }> {
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

export async function getCurrentCustomer(
  tokenOrCookie?: string
): Promise<SaleorCustomer | null> {
  const opts = tokenOrCookie ? { cookie: tokenOrCookie } : undefined
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
        country?: { code: string; name: string };
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
          country { code name }
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
  const [first = "", last = ""] = (c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()).split(" ");
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
        return {
          id: a.id,
          firstName: f,
          lastName: l,
          streetAddress1: a.streetLine1 ?? "",
          streetAddress2: a.streetLine2 ?? null,
          city: a.city ?? "",
          postalCode: a.postalCode ?? "",
          country: { code: a.country?.code ?? "", country: a.country?.name ?? "" },
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
  input: SaleorAddressInput,
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
  `, { input: toVendureAddress(input) }, { cookie: token });
  const result = (data as { createCustomerAddress?: { id?: string; message?: string } }).createCustomerAddress;
  if (result && "message" in result && result.message) {
    return { errors: [{ message: result.message }] };
  }
  return { addressId: (result as { id?: string })?.id };
}

export async function accountAddressUpdate(
  token: string,
  addressId: string,
  input: SaleorAddressInput
): Promise<{ errors?: { message: string; field?: string }[] }> {
  const data = await fetchVendure<{
    updateCustomerAddress: { message?: string };
  }>(`
    mutation UpdateCustomerAddress($id: ID!, $input: UpdateAddressInput!) {
      updateCustomerAddress(id: $id, input: $input) {
        ... on ErrorResult { message }
      }
    }
  `, { id: addressId, input: toVendureAddress(input) }, { cookie: token });
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
  `, { id: addressId }, { cookie: token });
  const result = (data as { deleteCustomerAddress?: { message?: string } }).deleteCustomerAddress;
  if (result?.message) return { errors: [{ message: result.message }] };
  return {};
}

export async function accountUpdate(
  token: string,
  input: { firstName: string; lastName: string }
): Promise<{ errors?: { message: string; field?: string }[] }> {
  await fetchVendure(`
    mutation UpdateCustomer($input: UpdateCustomerInput!) {
      updateCustomer(input: $input) {
        id
        ... on ErrorResult { message }
      }
    }
  `, { input }, { cookie: token });
  return {};
}

export async function refreshToken(
  _refreshToken: string
): Promise<AuthTokenResponse> {
  const customer = await getCurrentCustomer("session");
  if (!customer) throw new Error("Token refresh failed");
  return {
    token: "session",
    refreshToken: "session",
    user: { id: customer.id, email: customer.email },
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function mapVendureOrderToSaleorOrder(order: {
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
    countryCode?: string;
    country?: { name: string };
    province?: string;
    phoneNumber?: string;
  } | null;
  billingAddress?: Record<string, unknown> | null;
}): SaleorOrder {
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
        productName: l.productVariant.product.name,
        variantName: l.productVariant.name,
        quantity: l.quantity,
        unitPrice: { gross: { amount: l.unitPriceWithTax / 100, currency } },
        thumbnail: l.featuredAsset ?? null,
      })) ?? [],
    shippingAddress: order.shippingAddress
      ? {
          firstName: first,
          lastName: last,
          streetAddress1: order.shippingAddress.streetLine1 ?? "",
          streetAddress2: order.shippingAddress.streetLine2 ?? null,
          city: order.shippingAddress.city ?? "",
          postalCode: order.shippingAddress.postalCode ?? "",
          country: {
            code: order.shippingAddress.countryCode ?? "",
            country: order.shippingAddress.country?.name ?? "",
          },
          province: order.shippingAddress.province ?? null,
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
    countryCode?: string;
    country?: { name: string };
    province?: string;
    phoneNumber?: string;
  } | null;
} | null> {
  const data = await fetchVendure<{
    orderByCode: Parameters<typeof mapVendureOrderToSaleorOrder>[0] | null;
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
          countryCode
          country { name }
          province
          phoneNumber
        }
      }
    }
  `, { code }, opts);
  return data.orderByCode as Parameters<typeof mapVendureOrderToSaleorOrder>[0] | null;
}

export async function getCustomerOrders(
  token: string,
  first: number = 20,
  after?: string
): Promise<{ orders: SaleorOrder[]; hasNextPage: boolean; endCursor?: string }> {
  const data = await fetchVendure<{
    activeCustomer: {
      orders: {
        items: Parameters<typeof mapVendureOrderToSaleorOrder>[0][];
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
              countryCode
              country { name }
              province
              phoneNumber
            }
          }
          totalItems
        }
      }
    }
  `, { take: first, skip: after ? parseInt(after, 10) : 0 }, { cookie: token });
  const items = data.activeCustomer?.orders?.items ?? [];
  return {
    orders: items.map(mapVendureOrderToSaleorOrder),
    hasNextPage: (data.activeCustomer?.orders?.totalItems ?? 0) > first,
    endCursor: String((data.activeCustomer?.orders?.totalItems ?? 0)),
  };
}

/** Get order by code (Vendure uses code; use this for confirmation and account order detail) */
export async function getOrderByToken(tokenOrCode: string): Promise<SaleorOrder | null> {
  const order = await getOrderByCode(tokenOrCode);
  return order ? mapVendureOrderToSaleorOrder(order) : null;
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

export async function confirmAccount(
  _email: string,
  _token: string
): Promise<{ user?: SaleorCustomer; errors?: { message: string; field?: string }[] }> {
  return {};
}
