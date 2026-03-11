import { NextRequest, NextResponse } from "next/server"
import { requestPasswordReset } from "../../../../lib/vendure"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const result = await requestPasswordReset(email, `${baseUrl}/reset-password`)

    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    )
  }
}
