import {
  clerkMiddleware,
  createRouteMatcher,
  type ClerkMiddlewareOptions,
} from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextFetchEvent } from "next/server"
import { NextRequest } from "next/server"
import { effectiveClientScheme, getPublicOrigin, requestAwareOrigin } from "./lib/public-origin"
import {
  getConfiguredOpsHostname,
  isOpsHostname,
  isOpsRequestHeaders,
  normalizeHostname,
} from "./lib/ops-host"

const isOpsSignInRoute = createRouteMatcher(["/ops/sign-in(.*)"])

function isInternalNextHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h === "[::1]" || h === "::1"
}

/**
 * nginx → Next passes correct `Host`, but `request.nextUrl` is often still `https://localhost:3001/...`.
 * Clerk builds `clerkUrl` and middleware rewrites from that → `x-middleware-rewrite: https://localhost:3001/ops`,
 * which breaks handshakes and POST callbacks (e.g. Cloudflare challenge form posts back to `/ops`).
 */
function normalizeProxyRequestUrl(request: NextRequest): NextRequest {
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim()
  if (!hostHeader || !isInternalNextHostname(request.nextUrl.hostname)) {
    return request
  }

  const proto = effectiveClientScheme(request) || "https"
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`
  const url = new URL(path, `${proto}://${hostHeader}`)

  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  const source = request.clone()
  return new NextRequest(url, {
    method: source.method,
    headers: source.headers,
    ...(hasBody ? { body: source.body, duplex: "half" as const } : {}),
    signal: source.signal,
  })
}

/**
 * Origin for ops redirects. Prefer Host / X-Forwarded-Host only when it matches configured ops —
 * App Platform may send X-Forwarded-Host as the apex while Host is ops.example.com, which made
 * requestAwareOrigin point at the storefront domain.
 */
function opsRedirectOrigin(request: NextRequest): string {
  const ops = getConfiguredOpsHostname()
  const proto = effectiveClientScheme(request) || "https"
  if (ops) {
    const host = request.headers.get("host")?.split(",")[0]?.trim() ?? ""
    if (isOpsHostname(host)) {
      return `${proto}://${normalizeHostname(host)}`
    }
    const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? ""
    if (isOpsHostname(forwarded)) {
      return `${proto}://${normalizeHostname(forwarded)}`
    }
    return `${proto}://${ops}`
  }

  let origin = requestAwareOrigin(request)
  try {
    const hostname = new URL(origin).hostname.toLowerCase()
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const fallbackOps = getConfiguredOpsHostname()
      if (fallbackOps) {
        origin = `https://${fallbackOps}`
      }
    }
  } catch {
    /* keep origin */
  }
  return origin
}

function clerkKeysPresent(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  )
}

/**
 * Absolute sign-in URL Clerk uses for redirects / handshake. Required for stable auth behind reverse
 * proxies; if missing, Clerk can enter Handshake without Location → middleware throws (500).
 * Prefer NEXT_PUBLIC_CLERK_SIGN_IN_URL in dev (include port, e.g. http://localhost:3003/ops/sign-in).
 */
function opsClerkMiddlewareOptions(): ClerkMiddlewareOptions {
  const opsHost = getConfiguredOpsHostname()
  const signInUrl =
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() ||
    (opsHost
      ? `${opsHost === "localhost" || opsHost === "127.0.0.1" ? "http" : "https"}://${opsHost}/ops/sign-in`
      : undefined)

  return {
    contentSecurityPolicy: {},
    // Same-origin FAPI proxy: avoids third-party / cross-site cookie issues and fixes many handshake failures.
    frontendApiProxy: { enabled: true },
    ...(signInUrl ? { signInUrl } : {}),
  }
}

/** Vendure customer auth + hide /ops on the public storefront — no Clerk (Clerk would handshake-redirect every matched route). */
function storefrontMiddleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl
  const token = request.cookies.get("vendure_token")

  if (pathname.startsWith("/ops")) {
    return NextResponse.redirect(new URL("/", getPublicOrigin(request)))
  }

  const hasConfirmationToken = searchParams.has("token") || searchParams.has("t") || searchParams.has("key")
  const hasConfirmationEmail = searchParams.has("email") || searchParams.has("e")

  if (pathname.startsWith("/account")) {
    if (pathname === "/account" && hasConfirmationToken && hasConfirmationEmail) {
      return NextResponse.next()
    }
    if (pathname === "/account/confirm") {
      return NextResponse.next()
    }

    if (token) {
      return NextResponse.next()
    }

    const loginUrl = new URL("/login", getPublicOrigin(request))
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if ((pathname === "/login" || pathname === "/register") && token) {
    const hasRedirect = searchParams.has("redirect")
    if (!hasRedirect) {
      return NextResponse.redirect(new URL("/account", getPublicOrigin(request)))
    }
  }

  return NextResponse.next()
}

const opsClerkMiddleware = clerkMiddleware(
  async (auth, request) => {
    const { pathname } = request.nextUrl
    const clerkOk = clerkKeysPresent()

    if (process.env.NODE_ENV === "production" && !clerkOk) {
      if (pathname === "/" || pathname.startsWith("/ops")) {
        return new NextResponse(
          "Ops portal requires Clerk. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY on this component.",
          { status: 503 },
        )
      }
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/ops", opsRedirectOrigin(request)))
    }

    if (
      pathname.startsWith("/account") ||
      pathname === "/login" ||
      pathname === "/register"
    ) {
      return NextResponse.redirect(new URL("/ops", opsRedirectOrigin(request)))
    }

    if (pathname.startsWith("/ops") && !isOpsSignInRoute(request) && clerkOk) {
      await auth.protect()
    }

    return NextResponse.next()
  },
  opsClerkMiddlewareOptions,
)

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isOpsRequestHeaders(request.headers)) {
    return storefrontMiddleware(request)
  }
  return opsClerkMiddleware(normalizeProxyRequestUrl(request), event)
}

export const config = {
  matcher: [
    "/",
    "/ops",
    "/ops/:path*",
    "/account",
    "/account/:path*",
    "/login",
    "/register",
  ],
}
