import { NextRequest, NextResponse } from "next/server"
import { resetPassword } from "../../../../../lib/vendure"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token =
      typeof body.token === "string" ? body.token.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 }
      )
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    const result = await resetPassword(token, password)

    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Password has been reset. You can now sign in.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    )
  }
}
