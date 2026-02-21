import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentCustomer } from "../../../../lib/saleor"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("saleor_token")?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    try {
      const customer = await getCurrentCustomer(token)

      if (!customer) {
        // Clear invalid tokens
        cookieStore.delete("saleor_token")
        cookieStore.delete("saleor_refresh_token")
        return NextResponse.json({ user: null }, { status: 200 })
      }

      return NextResponse.json({ user: customer })
    } catch (apiError) {
      // If the API call fails (invalid token, network error, etc.), clear tokens and return null
      console.error("Failed to get current customer:", apiError)
      cookieStore.delete("saleor_token")
      cookieStore.delete("saleor_refresh_token")
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
