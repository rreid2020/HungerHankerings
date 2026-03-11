import { NextRequest, NextResponse } from "next/server"
import { confirmAccount } from "../../../../lib/vendure"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email") || searchParams.get("e")
  const token = searchParams.get("token") || searchParams.get("t") || searchParams.get("key")

  if (!email || !token) {
    return NextResponse.redirect(
      new URL(`/account/confirm?error=missing_params`, request.url)
    )
  }

  try {
    const result = await confirmAccount(email, token)

    if (result.errors?.length) {
      return NextResponse.redirect(
        new URL(`/account/confirm?error=${encodeURIComponent(result.errors[0].message)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`, request.url)
      )
    }

    // Success - redirect to login with success message
    return NextResponse.redirect(
      new URL(`/login?confirmed=true`, request.url)
    )
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/account/confirm?error=${encodeURIComponent(error instanceof Error ? error.message : "Confirmation failed")}`, request.url)
    )
  }
}
