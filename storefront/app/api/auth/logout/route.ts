import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

async function clearAndRedirect(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete("vendure_token")
  cookieStore.delete("vendure_refresh_token")
  cookieStore.delete("saleor_token")
  cookieStore.delete("saleor_refresh_token")

  const url = request.nextUrl.clone()
  url.pathname = "/"
  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request)
}

/** GET allows "Sign out" links (e.g. account sidebar) to work with a simple href. */
export async function GET(request: NextRequest) {
  return clearAndRedirect(request)
}
