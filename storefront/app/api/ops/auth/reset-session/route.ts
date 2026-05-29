import { NextRequest, NextResponse } from "next/server"

const EXPLICIT_COOKIE_NAMES = [
  "__session",
  "__client_uat",
  "__clerk_db_jwt",
  "__clerk_db_jwt_legacy",
  "__clerk_handshake",
] as const

function parentDomain(hostname: string): string | null {
  const parts = hostname.split(".").filter(Boolean)
  if (parts.length < 2) return null
  return `.${parts.slice(-2).join(".")}`
}

function clearCookie(
  response: NextResponse,
  name: string,
  domain?: string,
): void {
  response.cookies.set(name, "", {
    path: "/",
    ...(domain ? { domain } : {}),
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  })
}

function buildResetRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL("/ops/sign-in?reset=1", request.url)
  const response = NextResponse.redirect(signInUrl)
  const host = request.nextUrl.hostname
  const maybeParentDomain = parentDomain(host)

  const cookieNames = new Set<string>(EXPLICIT_COOKIE_NAMES)
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("__clerk") ||
      cookie.name.startsWith("__client") ||
      cookie.name.startsWith("__session")
    ) {
      cookieNames.add(cookie.name)
    }
  }

  for (const name of cookieNames) {
    clearCookie(response, name)
    clearCookie(response, name, host)
    if (maybeParentDomain) {
      clearCookie(response, name, maybeParentDomain)
    }
  }

  return response
}

export function GET(request: NextRequest): NextResponse {
  return buildResetRedirect(request)
}

export function POST(request: NextRequest): NextResponse {
  return buildResetRedirect(request)
}
