import { cookies } from "next/headers"
import { getCurrentCustomer, refreshToken } from "./vendure"
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
    const token = cookieStore.get("vendure_token")?.value ?? cookieStore.get("saleor_token")?.value

    if (!token) {
      return { user: null, hasToken: false }
    }

    const cookieSecure = await cookieSecureFromHeaders()
    let customer: Awaited<ReturnType<typeof getCurrentCustomer>> = null
    try {
      customer = await getCurrentCustomer(token)
    } catch {
      // API error (e.g. network) - try refresh once
      const refreshTokenValue = cookieStore.get("vendure_refresh_token")?.value ?? cookieStore.get("saleor_refresh_token")?.value
      if (refreshTokenValue) {
        try {
          const refreshed = await refreshToken(refreshTokenValue)
          cookieStore.set("vendure_token", refreshed.token, {
            httpOnly: true,
            secure: cookieSecure,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          })
          customer = await getCurrentCustomer(refreshed.token)
        } catch {
          cookieStore.delete("vendure_token")
          cookieStore.delete("vendure_refresh_token")
          cookieStore.delete("saleor_token")
          cookieStore.delete("saleor_refresh_token")
          return { user: null, hasToken: false }
        }
      } else {
        return { user: null, hasToken: true }
      }
    }

    if (!customer) {
      const refreshTokenValue = cookieStore.get("vendure_refresh_token")?.value ?? cookieStore.get("saleor_refresh_token")?.value
      if (refreshTokenValue) {
        try {
          const refreshed = await refreshToken(refreshTokenValue)
          cookieStore.set("vendure_token", refreshed.token, {
            httpOnly: true,
            secure: cookieSecure,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          })
          customer = await getCurrentCustomer(refreshed.token)
        } catch {
          cookieStore.delete("saleor_token")
          cookieStore.delete("saleor_refresh_token")
          return { user: null, hasToken: false }
        }
      }
      if (!customer) return { user: null, hasToken: true }
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
  return cookieStore.get("vendure_token")?.value ?? cookieStore.get("saleor_token")?.value ?? null
}
