import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPublicOrigin } from "../../../../lib/public-origin"

async function clearAndRedirect(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete("vendure_token")
  cookieStore.delete("vendure_refresh_token")

  const home = new URL("/", getPublicOrigin(request))
  return NextResponse.redirect(home)
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request)
}

/** GET allows "Sign out" links (e.g. account sidebar) to work with a simple href. */
export async function GET(request: NextRequest) {
  return clearAndRedirect(request)
}
