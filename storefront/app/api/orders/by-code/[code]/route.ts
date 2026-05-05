import { NextRequest, NextResponse } from "next/server"
import { getOrderByToken } from "../../../../../lib/vendure"

/**
 * Load order details for the confirmation page using the same cookies as the browser
 * (Shop API session + optional vendure_token).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params
    const trimmed = code?.trim()
    if (!trimmed) {
      return NextResponse.json({ error: "Missing order code" }, { status: 400 })
    }

    const cookieHeader = request.headers.get("cookie") ?? ""
    const bearer = request.cookies.get("vendure_token")?.value

    const order = await getOrderByToken(trimmed, {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(bearer ? { authToken: bearer } : {}),
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load order"
    const lower = message.toLowerCase()
    const forbidden =
      lower.includes("forbidden") ||
      lower.includes("not authorized") ||
      lower.includes("not currently authorized") ||
      message.includes("FORBIDDEN")
    return NextResponse.json({ error: message }, { status: forbidden ? 403 : 500 })
  }
}
