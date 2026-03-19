import { cookies } from "next/headers"
import { getCurrentCustomer } from "./vendure"
import { cookieSecureFromHeaders } from "./cookie-secure"

export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  isConfirmed: boolean
}

export type GetAuthUserResult = {
  user: AuthUser | null
  /** True if a token cookie was present (even if the API failed). Used to avoid redirecting when we have a token. */
  hasToken: boolean
}

/**
 * Get the current authenticated user from cookies.
 * Returns { user, hasToken }. Only redirect to login when hasToken is false.
 * When hasToken is true but user is null (e.g. API error), still show account UI so we don't log the user out.
 */
export async function getAuthUser(): Promise<GetAuthUserResult> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("vendure_token")?.value

    if (!token) {
      return { user: null, hasToken: false }
    }

    const cookieSecure = await cookieSecureFromHeaders()
    let customer: Awaited<ReturnType<typeof getCurrentCustomer>> = null
    try {
      customer = await getCurrentCustomer(token)
      // Often null right after redirect: session may not be visible to the next request yet. Retry once.
      if (!customer) {
        await new Promise((r) => setTimeout(r, 400))
        customer = await getCurrentCustomer(token)
      }
    } catch {
      // Network / Vendure error — do not wipe cookies (avoids login loop).
      return { user: null, hasToken: true }
    }

    if (!customer) {
      return { user: null, hasToken: true }
    }

    return {
      user: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        isConfirmed: customer.isConfirmed
      },
      hasToken: true
    }
  } catch {
    return { user: null, hasToken: false }
  }
}

/**
 * Get auth token from cookies (for API calls)
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("vendure_token")?.value ?? null
}
