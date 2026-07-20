import { getStorefrontPublicOrigin } from "./ops-host"

type AdminGraphqlResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

export type OpsVendureSnapshot =
  | {
      ok: true
      endpoint: string
      summary: {
        ordersTotal: number
        productsTotal: number
        customersTotal: number
      }
      recentOrders: Array<{
        id: string
        code: string
        state: string
        placedAt: string | null
        totalWithTax: number
        currencyCode: string
        customerName: string
        customerEmail: string
      }>
    }
  | {
      ok: false
      endpoint: string
      reason: "not_configured" | "query_failed"
      message: string
      required?: string[]
    }

export type OpsOrderRow = {
  id: string
  code: string
  state: string
  active: boolean
  placedAt: string | null
  totalWithTax: number
  subTotalWithTax: number
  currencyCode: string
  customerName: string
  customerEmail: string
  paymentState: string
  fulfillmentState: string
  flags: Array<"delayed" | "unpaid" | "high_value">
}

export type OpsOrdersCenterResult =
  | {
      ok: true
      endpoint: string
      includeOpenCarts: boolean
      summary: {
        totalOrders: number
        delayedOrders: number
        unpaidOrders: number
        highValueOrders: number
        openCartsInSample: number
      }
      orders: OpsOrderRow[]
    }
  | {
      ok: false
      endpoint: string
      reason: "not_configured" | "query_failed"
      message: string
      required?: string[]
    }

export type OpsCustomerRow = {
  id: string
  name: string
  email: string
  createdAt: string | null
  ordersCount: number
  lifetimeValue: number
  currencyCode: string
  lastOrderAt: string | null
}

export type OpsCustomer360Result =
  | {
      ok: true
      endpoint: string
      summary: {
        totalCustomers: number
        activeCustomersInSample: number
        repeatCustomersInSample: number
      }
      customers: OpsCustomerRow[]
    }
  | {
      ok: false
      endpoint: string
      reason: "not_configured" | "query_failed"
      message: string
      required?: string[]
    }

export type OpsProductPerformanceResult =
  | {
      ok: true
      endpoint: string
      summary: {
        totalProducts: number
        soldProductsInSample: number
        lowStockVariants: number
        zeroSalesProductsInSample: number
      }
      topProductsByRevenue: Array<{
        key: string
        productName: string
        sku: string
        units: number
        revenueWithTax: number
        currencyCode: string
      }>
      lowStock: Array<{
        productName: string
        variantName: string
        sku: string
        stockOnHand: number
      }>
      zeroSalesProducts: Array<{
        id: string
        name: string
      }>
    }
  | {
      ok: false
      endpoint: string
      reason: "not_configured" | "query_failed"
      message: string
      required?: string[]
    }

function adminApiEndpoint(): string {
  const explicit = process.env.VENDURE_ADMIN_API_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  // Prefer in-container Vendure (App Platform / Docker). Calling the public
  // https://…/admin-api from Next often drops the `vendure-auth-token` response
  // header at the edge proxy, so login looks configured but never gets a token.
  const fromShop = process.env.VENDURE_SHOP_API_URL?.trim().replace(/\/shop-api\/?$/i, "/admin-api")
  if (fromShop && /^https?:\/\//i.test(fromShop)) return fromShop.replace(/\/+$/, "")

  const base = getStorefrontPublicOrigin()
  return base ? `${base}/admin-api` : "http://127.0.0.1:3000/admin-api"
}

function adminApiToken(): string {
  return process.env.VENDURE_ADMIN_API_TOKEN?.trim() || ""
}

function adminUsername(): string {
  return (
    process.env.VENDURE_ADMIN_USERNAME?.trim() ||
    process.env.SUPERADMIN_USERNAME?.trim() ||
    ""
  )
}

function adminPassword(): string {
  return (
    process.env.VENDURE_ADMIN_PASSWORD?.trim() ||
    process.env.SUPERADMIN_PASSWORD?.trim() ||
    ""
  )
}

const VENDURE_AUTH_HEADER = "vendure-auth-token"

async function loginAdminToken(endpoint: string): Promise<{ token: string; error?: string }> {
  const username = adminUsername()
  const password = adminPassword()
  if (!username || !password) {
    return { token: "", error: "Missing VENDURE_ADMIN_USERNAME/PASSWORD or SUPERADMIN_USERNAME/PASSWORD" }
  }

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
            login(username: $username, password: $password, rememberMe: $rememberMe) {
              ... on CurrentUser { id identifier }
              ... on InvalidCredentialsError { message errorCode }
              ... on ErrorResult { message errorCode }
            }
          }
        `,
        variables: { username, password, rememberMe: true },
      }),
      cache: "no-store",
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { token: "", error: `Could not reach Admin API at ${endpoint}: ${msg}` }
  }

  if (!res.ok) {
    return { token: "", error: `Admin API login HTTP ${res.status} from ${endpoint}` }
  }

  const token = res.headers.get(VENDURE_AUTH_HEADER)?.trim() || ""
  if (!token) {
    return {
      token: "",
      error: `Admin API login succeeded but no ${VENDURE_AUTH_HEADER} header from ${endpoint}. Set VENDURE_ADMIN_API_URL=http://127.0.0.1:3000/admin-api for in-container calls.`,
    }
  }

  const payload = (await res.json()) as AdminGraphqlResponse<{
    login?: { id?: string; message?: string }
  }>
  if (payload.errors?.length || payload.data?.login?.message || !payload.data?.login?.id) {
    const detail =
      payload.data?.login?.message ||
      payload.errors?.map((e) => e.message).join("; ") ||
      "invalid credentials"
    return { token: "", error: `Admin API login failed: ${detail}` }
  }
  return { token }
}

async function fetchVendureAdmin<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const endpoint = adminApiEndpoint()
  let token = adminApiToken()
  if (!token) {
    const login = await loginAdminToken(endpoint)
    token = login.token
    if (!token) {
      throw new Error(login.error || "Vendure Admin API login failed")
    }
  }

  if (!endpoint || !token) {
    throw new Error(
      "Vendure Admin API not configured. Set VENDURE_ADMIN_API_TOKEN or SUPERADMIN_USERNAME/SUPERADMIN_PASSWORD, and VENDURE_ADMIN_API_URL=http://127.0.0.1:3000/admin-api on App Platform.",
    )
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "vendure-auth-token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Vendure Admin API request failed (${res.status}): ${body.slice(0, 180)}`)
  }

  const payload = (await res.json()) as AdminGraphqlResponse<T>
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "))
  }
  if (!payload.data) {
    throw new Error("Vendure Admin API returned no data")
  }
  return payload.data
}

function displayCustomerName(customer?: { firstName?: string | null; lastName?: string | null } | null) {
  const name = [customer?.firstName ?? "", customer?.lastName ?? ""].join(" ").trim()
  return name || "Guest"
}

function isOrderSettled(paymentState: string): boolean {
  const value = paymentState.toLowerCase()
  return value.includes("settled") || value.includes("authorized")
}

function mostRelevantPaymentState(
  payments?: Array<{ state?: string | null }> | null,
): string {
  const states = (payments ?? []).map((p) => p.state?.trim()).filter(Boolean) as string[]
  if (states.some((s) => s.toLowerCase().includes("settled"))) return "Settled"
  if (states.some((s) => s.toLowerCase().includes("authorized"))) return "Authorized"
  return states[0] ?? "None"
}

function mostRelevantFulfillmentState(
  fulfillments?: Array<{ state?: string | null }> | null,
): string {
  const states = (fulfillments ?? [])
    .map((f) => f.state?.trim())
    .filter(Boolean) as string[]
  if (states.some((s) => s.toLowerCase().includes("delivered"))) return "Delivered"
  if (states.some((s) => s.toLowerCase().includes("shipped"))) return "Shipped"
  return states[0] ?? "Not fulfilled"
}

function isVendureConfigured(): {
  ok: boolean
  endpoint: string
  required?: string[]
  message?: string
} {
  const endpoint = adminApiEndpoint()
  const token = adminApiToken()
  const username = adminUsername()
  const password = adminPassword()

  if (token || (username && password)) {
    return { ok: true, endpoint }
  }

  return {
    ok: false,
    endpoint,
    message:
      "Set VENDURE_ADMIN_API_TOKEN or provide VENDURE_ADMIN_USERNAME/VENDURE_ADMIN_PASSWORD (SUPERADMIN_* is also accepted).",
    required: [
      "VENDURE_ADMIN_API_TOKEN OR VENDURE_ADMIN_USERNAME + VENDURE_ADMIN_PASSWORD",
      "VENDURE_ADMIN_API_URL (optional if same host)",
    ],
  }
}

export async function loadOpsVendureSnapshot(): Promise<OpsVendureSnapshot> {
  const config = isVendureConfigured()
  if (!config.ok) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "not_configured",
      message: config.message ?? "Vendure configuration is missing.",
      required: config.required,
    }
  }

  try {
    const data = await fetchVendureAdmin<{
      orders: {
        totalItems: number
        items: Array<{
          id: string
          code: string
          state: string
          orderPlacedAt: string | null
          totalWithTax: number
          currencyCode: string
          customer?: {
            firstName?: string | null
            lastName?: string | null
            emailAddress?: string | null
          } | null
        }>
      }
      products: { totalItems: number }
      customers: { totalItems: number }
    }>(
      `
      query OpsVendureSnapshot {
        orders(options: { take: 8, sort: { orderPlacedAt: DESC }, filter: { active: { eq: false } } }) {
          totalItems
          items {
            id
            code
            state
            orderPlacedAt
            totalWithTax
            currencyCode
            customer {
              firstName
              lastName
              emailAddress
            }
          }
        }
        products(options: { take: 1 }) {
          totalItems
        }
        customers(options: { take: 1 }) {
          totalItems
        }
      }
      `,
    )

    return {
      ok: true,
      endpoint: config.endpoint,
      summary: {
        ordersTotal: data.orders.totalItems,
        productsTotal: data.products.totalItems,
        customersTotal: data.customers.totalItems,
      },
      recentOrders: data.orders.items.map((order) => ({
        id: order.id,
        code: order.code,
        state: order.state,
        placedAt: order.orderPlacedAt,
        totalWithTax: order.totalWithTax,
        currencyCode: order.currencyCode,
        customerName: displayCustomerName(order.customer),
        customerEmail: order.customer?.emailAddress?.trim() || "N/A",
      })),
    }
  } catch (error) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Vendure query failed",
    }
  }
}

export async function loadOpsOrdersCenter(options?: {
  /** When true, include abandoned carts (Draft / AddingItems). Default: placed orders only. */
  includeOpenCarts?: boolean
  take?: number
}): Promise<OpsOrdersCenterResult> {
  const includeOpenCarts = options?.includeOpenCarts === true
  const take = Math.min(Math.max(options?.take ?? 200, 1), 500)
  const config = isVendureConfigured()
  if (!config.ok) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "not_configured",
      message: config.message ?? "Vendure configuration is missing.",
      required: config.required,
    }
  }

  try {
    // Placed orders are `active: false`. Open carts / incomplete checkouts are `active: true`
    // and were previously flooding this list (null orderPlacedAt sorts first).
    const filterClause = includeOpenCarts ? "" : "filter: { active: { eq: false } }"
    const data = await fetchVendureAdmin<{
      orders: {
        totalItems: number
        items: Array<{
          id: string
          code: string
          state: string
          active: boolean
          orderPlacedAt: string | null
          totalWithTax: number
          subTotalWithTax: number
          currencyCode: string
          customer?: {
            firstName?: string | null
            lastName?: string | null
            emailAddress?: string | null
          } | null
          payments?: Array<{ state?: string | null }> | null
          fulfillments?: Array<{ state?: string | null }> | null
        }>
      }
      openCarts: { totalItems: number }
    }>(
      `
      query OpsOrdersCenter($take: Int!) {
        orders(
          options: {
            take: $take
            sort: { orderPlacedAt: DESC }
            ${filterClause}
          }
        ) {
          totalItems
          items {
            id
            code
            state
            active
            orderPlacedAt
            totalWithTax
            subTotalWithTax
            currencyCode
            customer {
              firstName
              lastName
              emailAddress
            }
            payments {
              state
            }
            fulfillments {
              state
            }
          }
        }
        openCarts: orders(options: { take: 0, filter: { active: { eq: true } } }) {
          totalItems
        }
      }
      `,
      { take },
    )

    const now = Date.now()
    const delayedCutoffMs = 1000 * 60 * 60 * 48

    const orders = data.orders.items.map((order) => {
      const paymentState = mostRelevantPaymentState(order.payments)
      const fulfillmentState = mostRelevantFulfillmentState(order.fulfillments)
      const placedMs = order.orderPlacedAt ? new Date(order.orderPlacedAt).getTime() : NaN
      const orderState = order.state.toLowerCase()
      const isOpenCart = order.active === true
      const fulfilled =
        orderState.includes("delivered") ||
        orderState.includes("shipped") ||
        fulfillmentState.toLowerCase().includes("delivered") ||
        fulfillmentState.toLowerCase().includes("shipped")
      const delayed =
        !isOpenCart && Number.isFinite(placedMs) && !fulfilled && now - placedMs > delayedCutoffMs
      // Only flag unpaid for incomplete checkouts / unpaid placed orders — not open-cart noise when mixed in.
      const unpaid = !isOrderSettled(paymentState)
      const highValue = order.totalWithTax >= 25_000

      const flags: Array<"delayed" | "unpaid" | "high_value"> = []
      if (delayed) flags.push("delayed")
      if (unpaid) flags.push("unpaid")
      if (highValue) flags.push("high_value")

      return {
        id: order.id,
        code: order.code,
        state: order.state,
        active: order.active === true,
        placedAt: order.orderPlacedAt,
        totalWithTax: order.totalWithTax,
        subTotalWithTax: order.subTotalWithTax,
        currencyCode: order.currencyCode,
        customerName: displayCustomerName(order.customer),
        customerEmail: order.customer?.emailAddress?.trim() || "N/A",
        paymentState,
        fulfillmentState,
        flags,
      } satisfies OpsOrderRow
    })

    return {
      ok: true,
      endpoint: config.endpoint,
      includeOpenCarts,
      summary: {
        totalOrders: data.orders.totalItems,
        delayedOrders: orders.filter((o) => o.flags.includes("delayed")).length,
        unpaidOrders: orders.filter((o) => o.flags.includes("unpaid")).length,
        highValueOrders: orders.filter((o) => o.flags.includes("high_value")).length,
        openCartsInSample: data.openCarts.totalItems,
      },
      orders,
    }
  } catch (error) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Vendure query failed",
    }
  }
}

export async function loadOpsCustomer360(): Promise<OpsCustomer360Result> {
  const config = isVendureConfigured()
  if (!config.ok) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "not_configured",
      message: config.message ?? "Vendure configuration is missing.",
      required: config.required,
    }
  }

  try {
    const data = await fetchVendureAdmin<{
      customers: {
        totalItems: number
        items: Array<{
          id: string
          firstName?: string | null
          lastName?: string | null
          emailAddress?: string | null
          createdAt?: string | null
        }>
      }
      orders: {
        items: Array<{
          orderPlacedAt?: string | null
          totalWithTax: number
          currencyCode: string
          customer?: {
            firstName?: string | null
            lastName?: string | null
            emailAddress?: string | null
          } | null
        }>
      }
    }>(
      `
      query OpsCustomer360 {
        customers(options: { take: 120, sort: { createdAt: DESC } }) {
          totalItems
          items {
            id
            firstName
            lastName
            emailAddress
            createdAt
          }
        }
        orders(options: { take: 400, sort: { orderPlacedAt: DESC } }) {
          items {
            orderPlacedAt
            totalWithTax
            currencyCode
            customer {
              firstName
              lastName
              emailAddress
            }
          }
        }
      }
      `,
    )

    const aggregate = new Map<
      string,
      { ordersCount: number; lifetimeValue: number; lastOrderAt: string | null; currencyCode: string }
    >()

    for (const order of data.orders.items) {
      const email = order.customer?.emailAddress?.trim().toLowerCase()
      if (!email) continue
      const current = aggregate.get(email) ?? {
        ordersCount: 0,
        lifetimeValue: 0,
        lastOrderAt: null,
        currencyCode: order.currencyCode || "CAD",
      }
      current.ordersCount += 1
      current.lifetimeValue += order.totalWithTax
      current.currencyCode = current.currencyCode || order.currencyCode || "CAD"
      if (!current.lastOrderAt || (order.orderPlacedAt && order.orderPlacedAt > current.lastOrderAt)) {
        current.lastOrderAt = order.orderPlacedAt ?? current.lastOrderAt
      }
      aggregate.set(email, current)
    }

    const customers = data.customers.items
      .map((customer) => {
        const email = customer.emailAddress?.trim() || ""
        const stats = aggregate.get(email.toLowerCase())
        return {
          id: customer.id,
          name: displayCustomerName(customer),
          email: email || "N/A",
          createdAt: customer.createdAt ?? null,
          ordersCount: stats?.ordersCount ?? 0,
          lifetimeValue: stats?.lifetimeValue ?? 0,
          currencyCode: stats?.currencyCode ?? "CAD",
          lastOrderAt: stats?.lastOrderAt ?? null,
        } satisfies OpsCustomerRow
      })
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)

    return {
      ok: true,
      endpoint: config.endpoint,
      summary: {
        totalCustomers: data.customers.totalItems,
        activeCustomersInSample: customers.filter((c) => c.ordersCount > 0).length,
        repeatCustomersInSample: customers.filter((c) => c.ordersCount > 1).length,
      },
      customers,
    }
  } catch (error) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Vendure query failed",
    }
  }
}

export async function loadOpsProductPerformance(): Promise<OpsProductPerformanceResult> {
  const config = isVendureConfigured()
  if (!config.ok) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "not_configured",
      message: config.message ?? "Vendure configuration is missing.",
      required: config.required,
    }
  }

  try {
    const data = await fetchVendureAdmin<{
      products: {
        totalItems: number
        items: Array<{
          id: string
          name: string
          variants: Array<{
            id: string
            name: string
            sku: string
            stockOnHand: number
          }>
        }>
      }
      orders: {
        items: Array<{
          lines: Array<{
            quantity: number
            linePriceWithTax: number
            productVariant?: {
              id?: string | null
              name?: string | null
              sku?: string | null
              product?: {
                id?: string | null
                name?: string | null
              } | null
            } | null
          }>
        }>
      }
    }>(
      `
      query OpsProductPerformance {
        products(options: { take: 250, sort: { createdAt: DESC } }) {
          totalItems
          items {
            id
            name
            variants {
              id
              name
              sku
              stockOnHand
            }
          }
        }
        orders(options: { take: 400, sort: { orderPlacedAt: DESC } }) {
          items {
            lines {
              quantity
              linePriceWithTax
              productVariant {
                id
                name
                sku
                product {
                  id
                  name
                }
              }
            }
          }
        }
      }
      `,
    )

    const soldProductIds = new Set<string>()
    const salesMap = new Map<
      string,
      {
        productName: string
        sku: string
        units: number
        revenueWithTax: number
        currencyCode: string
      }
    >()

    for (const order of data.orders.items) {
      for (const line of order.lines ?? []) {
        const variant = line.productVariant
        const key = (variant?.id ?? "").trim() || `${variant?.sku ?? "unknown"}:${variant?.name ?? "variant"}`
        if (!key) continue

        const productId = variant?.product?.id?.trim()
        if (productId) soldProductIds.add(productId)

        const current = salesMap.get(key) ?? {
          productName: variant?.product?.name?.trim() || variant?.name?.trim() || "Unknown product",
          sku: variant?.sku?.trim() || "N/A",
          units: 0,
          revenueWithTax: 0,
          currencyCode: "CAD",
        }
        current.units += Math.max(0, line.quantity ?? 0)
        current.revenueWithTax += Math.max(0, line.linePriceWithTax ?? 0)
        salesMap.set(key, current)
      }
    }

    const topProductsByRevenue = Array.from(salesMap.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.revenueWithTax - a.revenueWithTax)
      .slice(0, 20)

    const lowStock = data.products.items
      .flatMap((product) =>
        (product.variants ?? []).map((variant) => ({
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku || "N/A",
          stockOnHand: variant.stockOnHand ?? 0,
        })),
      )
      .filter((row) => row.stockOnHand <= 5)
      .sort((a, b) => a.stockOnHand - b.stockOnHand)
      .slice(0, 30)

    const zeroSalesProducts = data.products.items
      .filter((product) => !soldProductIds.has(product.id))
      .map((product) => ({ id: product.id, name: product.name }))
      .slice(0, 50)

    return {
      ok: true,
      endpoint: config.endpoint,
      summary: {
        totalProducts: data.products.totalItems,
        soldProductsInSample: soldProductIds.size,
        lowStockVariants: lowStock.length,
        zeroSalesProductsInSample: zeroSalesProducts.length,
      },
      topProductsByRevenue,
      lowStock,
      zeroSalesProducts,
    }
  } catch (error) {
    return {
      ok: false,
      endpoint: config.endpoint,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Vendure query failed",
    }
  }
}

export type ResendOrderConfirmationResult =
  | {
      ok: true
      message: string
      orderCode: string
      recipientEmail: string
    }
  | {
      ok: false
      message: string
      orderCode?: string
      recipientEmail?: string
      reason?: "not_configured" | "mutation_failed" | "not_eligible"
    }

/** Whether the ops UI should offer confirmation resend for this row. */
export function canResendOrderConfirmation(order: {
  state: string
  paymentState: string
  customerEmail: string
}): boolean {
  const email = order.customerEmail.trim()
  if (!email || email === "N/A") return false
  const state = order.state.toLowerCase()
  if (state.includes("cancel")) return false
  if (state === "paymentsettled") return true
  if (state.includes("shipped") || state.includes("delivered") || state.includes("fulfill")) {
    return true
  }
  return isOrderSettled(order.paymentState)
}

/**
 * Queue a customer order confirmation resend via Vendure Admin mutation.
 * Does not change order state; relies on vendure-worker SMTP.
 */
export async function resendOrderConfirmationEmail(
  orderCode: string,
): Promise<ResendOrderConfirmationResult> {
  const code = orderCode.trim()
  if (!code) {
    return { ok: false, message: "Order code is required", reason: "mutation_failed" }
  }

  const config = isVendureConfigured()
  if (!config.ok) {
    return {
      ok: false,
      message: config.message ?? "Vendure configuration is missing.",
      reason: "not_configured",
    }
  }

  try {
    const data = await fetchVendureAdmin<{
      resendOrderConfirmationEmail: {
        success: boolean
        message: string
        orderCode: string | null
        recipientEmail: string | null
      }
    }>(
      `
      mutation ResendOrderConfirmation($orderCode: String!) {
        resendOrderConfirmationEmail(orderCode: $orderCode) {
          success
          message
          orderCode
          recipientEmail
        }
      }
      `,
      { orderCode: code },
    )

    const result = data.resendOrderConfirmationEmail
    if (!result?.success) {
      return {
        ok: false,
        message: result?.message || "Could not resend confirmation",
        orderCode: result?.orderCode ?? code,
        recipientEmail: result?.recipientEmail ?? undefined,
        reason: "not_eligible",
      }
    }

    return {
      ok: true,
      message: result.message,
      orderCode: result.orderCode || code,
      recipientEmail: result.recipientEmail || "",
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Vendure mutation failed",
      orderCode: code,
      reason: "mutation_failed",
    }
  }
}
