import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { getPublicOrigin } from "./lib/public-origin"
import { getConfiguredOpsHostname, normalizeHostname } from "./lib/ops-host"

const isOpsSignInRoute = createRouteMatcher(["/ops/sign-in(.*)"])

function requestHost(request: NextRequest): string {
  const raw =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim() ||
    ""
  return normalizeHostname(raw)
}

function isOpsRequest(request: NextRequest): boolean {
  const configuredOps = getConfiguredOpsHostname()
  const host = requestHost(request)
  return Boolean(configuredOps && host === configuredOps)
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

const opsClerkMiddleware = clerkMiddleware(async (auth, request) => {
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
    return NextResponse.redirect(new URL("/ops", request.url))
  }

  if (
    pathname.startsWith("/account") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.redirect(new URL("/ops", request.url))
  }

  if (pathname.startsWith("/ops") && !isOpsSignInRoute(request) && clerkOk) {
    await auth.protect()
  }

  return NextResponse.next()
})

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isOpsRequest(request)) {
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
