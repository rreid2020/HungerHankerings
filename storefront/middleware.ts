import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { effectiveClientScheme, getPublicOrigin, requestAwareOrigin } from "./lib/public-origin"
import {
  getConfiguredOpsHostname,
  isOpsHostname,
  isOpsRequestHeaders,
  normalizeHostname,
} from "./lib/ops-host"

const isOpsSignInRoute = createRouteMatcher(["/ops/sign-in(.*)"])

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
  {
    // Clerk-owned CSP for the ops host (FAPI, img.clerk.com, Cloudflare challenges). Global nginx CSP
    // previously blocked these (separate browser policies) and broke handshake/iframes — see APP-PLATFORM.md.
    contentSecurityPolicy: {},
  },
)

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isOpsRequestHeaders(request.headers)) {
    return storefrontMiddleware(request)
  }
  return opsClerkMiddleware(request, event)
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
