import { NextRequest, NextResponse } from "next/server"
import { confirmAccount } from "../../../../lib/vendure"
import { getPublicOrigin } from "../../../../lib/public-origin"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get("email") || searchParams.get("e")
  const token = searchParams.get("token") || searchParams.get("t") || searchParams.get("key")
  const base = getPublicOrigin(request)

  if (!email || !token) {
    return NextResponse.redirect(new URL(`/account/confirm?error=missing_params`, base))
  }

  try {
    const result = await confirmAccount(email, token)

    if (result.errors?.length) {
      return NextResponse.redirect(
        new URL(
          `/account/confirm?error=${encodeURIComponent(result.errors[0].message)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
          base
        )
      )
    }

    return NextResponse.redirect(new URL(`/login?confirmed=true`, base))
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/account/confirm?error=${encodeURIComponent(error instanceof Error ? error.message : "Confirmation failed")}`,
        base
      )
    )
  }
}
