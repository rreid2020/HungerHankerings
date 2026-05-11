import { NextRequest, NextResponse } from "next/server"
import { resolveShippingRate } from "../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await resolveShippingRate({
      postalCode: String(body?.postalCode ?? ""),
      orderSubtotal: Number(body?.orderSubtotal ?? 0),
      recordFallbackUsage: true,
    })
    return NextResponse.json(result, { status: result.success ? 200 : 503 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipping rate lookup failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

