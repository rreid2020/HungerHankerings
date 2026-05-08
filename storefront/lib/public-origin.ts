import type { NextRequest } from "next/server"

/**
 * Scheme the **browser** used (HTTPS at the edge). Nginx may set `X-Forwarded-Proto: http`
 * for the internal Next.js hop while forwarding the real scheme as `X-Forwarded-Client-Proto`.
 */
export function effectiveClientScheme(request: NextRequest): string | null {
  const p =
    request.headers.get("x-forwarded-client-proto")?.split(",")?.[0]?.trim().toLowerCase() ||
    request.headers.get("x-forwarded-proto")?.split(",")?.[0]?.trim().toLowerCase()
  return p || null
}

export function effectiveClientSchemeFromHeaders(
  getHeader: (name: string) => string | null,
): string | null {
  const p =
    getHeader("x-forwarded-client-proto")?.split(",")?.[0]?.trim().toLowerCase() ||
    getHeader("x-forwarded-proto")?.split(",")?.[0]?.trim().toLowerCase()
  return p || null
}

/**
 * Origin the browser can navigate to (e.g. after logout redirect).
 * In Docker, `request.nextUrl.origin` is often `http://0.0.0.0:3000` because the server
 * binds to 0.0.0.0 — that is invalid for clients (ERR_ADDRESS_INVALID).
 * Prefer env, then proxy headers (nginx), then Host, never 0.0.0.0.
 */
export function getPublicOrigin(request: NextRequest): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "")
  if (fromEnv && !isInvalidPublicHost(fromEnv)) {
    return fromEnv
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  if (forwardedHost && !isInvalidHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim()
  if (host && !isInvalidHost(host)) {
    return `${forwardedProto}://${host}`
  }

  const nu = request.nextUrl
  if (nu.hostname && !isInvalidHost(nu.hostname)) {
    return nu.origin
  }

  return "http://localhost:3000"
}

function isInvalidHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(":")[0]
  return h === "0.0.0.0" || h === "[::]" || h === "::"
}

function isInvalidPublicHost(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `http://${url}`)
    return isInvalidHost(u.hostname)
  } catch {
    return true
  }
}

function isLoopbackOrWildcardHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(":")[0]
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h === "::1"
  )
}

/**
 * Origin as the browser sees it (trust proxy headers). Use for redirects on the **same** host
 * as the request (e.g. ops → /ops). Do not use `request.url` behind nginx: Next binds to
 * :3001 internally, so `request.url` becomes `https://localhost:3001/...` and breaks clients.
 */
export function requestAwareOrigin(request: NextRequest): string {
  const forwardedProto = effectiveClientScheme(request) || "https"
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  if (forwardedHost && !isInvalidHost(forwardedHost) && !isLoopbackOrWildcardHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim()
  if (host && !isInvalidHost(host) && !isLoopbackOrWildcardHost(host)) {
    return `${forwardedProto}://${host}`
  }

  const nu = request.nextUrl
  if (nu.hostname && !isInvalidHost(nu.hostname) && !isLoopbackOrWildcardHost(nu.hostname)) {
    return nu.origin
  }

  return getPublicOrigin(request)
}
