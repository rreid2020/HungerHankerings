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

function adminApiEndpoint(): string {
  const explicit = process.env.VENDURE_ADMIN_API_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")
  const base = getStorefrontPublicOrigin()
  return base ? `${base}/admin-api` : "http://localhost:3000/admin-api"
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

async function loginAdminToken(endpoint: string): Promise<string> {
  const username = adminUsername()
  const password = adminPassword()
  if (!username || !password) return ""

  const res = await fetch(endpoint, {
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

  if (!res.ok) return ""
  const token = res.headers.get(VENDURE_AUTH_HEADER)?.trim() || ""
  if (!token) return ""

  const payload = (await res.json()) as AdminGraphqlResponse<{
    login?: { id?: string; message?: string }
  }>
  if (payload.errors?.length || payload.data?.login?.message || !payload.data?.login?.id) {
    return ""
  }
  return token
}

async function fetchVendureAdmin<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const endpoint = adminApiEndpoint()
  const token = adminApiToken() || (await loginAdminToken(endpoint))

  if (!endpoint || !token) {
    throw new Error("Vendure Admin API not configured")
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

export async function loadOpsVendureSnapshot(): Promise<OpsVendureSnapshot> {
  const endpoint = adminApiEndpoint()
  const token = adminApiToken()
  const username = adminUsername()
  const password = adminPassword()

  if (!token && (!username || !password)) {
    return {
      ok: false,
      endpoint,
      reason: "not_configured",
      message:
        "Set VENDURE_ADMIN_API_TOKEN or provide VENDURE_ADMIN_USERNAME/VENDURE_ADMIN_PASSWORD in storefront runtime environment.",
      required: [
        "VENDURE_ADMIN_API_TOKEN OR VENDURE_ADMIN_USERNAME + VENDURE_ADMIN_PASSWORD",
        "VENDURE_ADMIN_API_URL (optional if same host)",
      ],
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
        orders(options: { take: 8, sort: { orderPlacedAt: DESC } }) {
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
      endpoint,
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
      endpoint,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Vendure query failed",
    }
  }
}
