import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
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

function clerkKeysPresent(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  )
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname, searchParams } = request.nextUrl
  const token = request.cookies.get("vendure_token")

  const configuredOps = getConfiguredOpsHostname()
  const host = requestHost(request)
  const isOps = Boolean(configuredOps && host === configuredOps)
  const clerkOk = clerkKeysPresent()

  if (!isOps && pathname.startsWith("/ops")) {
    return NextResponse.redirect(new URL("/", getPublicOrigin(request)))
  }

  if (isOps && process.env.NODE_ENV === "production" && !clerkOk) {
    if (pathname === "/" || pathname.startsWith("/ops")) {
      return new NextResponse(
        "Ops portal requires Clerk. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY on this component.",
        { status: 503 },
      )
    }
  }

  if (isOps && pathname === "/") {
    return NextResponse.redirect(new URL("/ops", request.url))
  }

  if (
    isOps &&
    (pathname.startsWith("/account") ||
      pathname === "/login" ||
      pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/ops", request.url))
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

  if (isOps && pathname.startsWith("/ops") && !isOpsSignInRoute(request) && clerkOk) {
    await auth.protect()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/",
    "/ops/:path*",
    "/account",
    "/account/:path*",
    "/login",
    "/register",
  ],
}
