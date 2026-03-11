import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const token = request.cookies.get("vendure_token") ?? request.cookies.get("saleor_token")

  // Allow access to account page if there's a confirmation token (from email confirmation links)
  const hasConfirmationToken = searchParams.has("token") || searchParams.has("t") || searchParams.has("key")
  const hasConfirmationEmail = searchParams.has("email") || searchParams.has("e")
  
  // Protect account routes - redirect to login if not authenticated
  // BUT allow access if there's a confirmation token (let the page handle it)
  // OR if there's a token cookie (let the page validate it - don't create redirect loop)
  if (pathname.startsWith("/account")) {
    // Allow access to /account page with confirmation token, or to /account/confirm
    if (pathname === "/account" && hasConfirmationToken && hasConfirmationEmail) {
      return NextResponse.next()
    }
    if (pathname === "/account/confirm") {
      return NextResponse.next()
    }
    
    // If there's a token cookie, let the page handle validation (don't redirect here to avoid loops)
    if (token) {
      return NextResponse.next()
    }
    
    // No token and no confirmation token - redirect to login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from login/register pages
  // BUT only if we're not coming from a redirect (to avoid loops)
  // The account page will validate the token and clear it if invalid
  if ((pathname === "/login" || pathname === "/register") && token) {
    // Check if there's a redirect param - if so, let the page handle it
    // This prevents loops when token is invalid
    const hasRedirect = searchParams.has("redirect")
    if (!hasRedirect) {
      return NextResponse.redirect(new URL("/account", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/account/:path*", "/login", "/register"]
}
