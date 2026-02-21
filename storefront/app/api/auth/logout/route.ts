import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete("saleor_token")
  cookieStore.delete("saleor_refresh_token")

  const url = request.nextUrl.clone()
  url.pathname = "/"
  return NextResponse.redirect(url)
}
