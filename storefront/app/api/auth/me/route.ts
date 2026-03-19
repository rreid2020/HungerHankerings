import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentCustomer } from "../../../../lib/vendure"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("vendure_token")?.value
    const cookieHeader = request.headers.get("cookie") ?? undefined

    if (!token && !cookieHeader) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    try {
      const customer = await getCurrentCustomer(token ?? cookieHeader ?? undefined)

      if (!customer) {
        return NextResponse.json({ user: null }, { status: 200 })
      }

      return NextResponse.json({ user: customer })
    } catch (apiError) {
      console.error("Failed to get current customer:", apiError)
      return NextResponse.json({ user: null }, { status: 200 })
    }
  } catch (error) {
    // Catch any other errors (like cookie access issues)
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get user", user: null },
      { status: 200 }
    )
  }
}
