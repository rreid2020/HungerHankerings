import type { NextRequest } from "next/server"
import { headers } from "next/headers"

/**
 * Use Secure cookies only when the client connected over HTTPS.
 * On HTTP (e.g. droplet :80 before TLS), Secure cookies are dropped by the browser — login appears to do nothing.
 */
export function cookieSecureFromRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase()
  if (forwarded === "https") return true
  if (forwarded === "http") return false
  return request.nextUrl.protocol === "https:"
}

/** For RSC / server actions (token refresh, loginAction). */
export async function cookieSecureFromHeaders(): Promise<boolean> {
  try {
    const h = await headers()
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase()
    if (proto === "https") return true
    if (proto === "http") return false
  } catch {
    /* no request context */
  }
  return false
}
