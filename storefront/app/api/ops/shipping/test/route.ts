import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { resolveShippingRate } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    await requireOpsUserId()
    const body = await request.json()
    const result = await resolveShippingRate({
      postalCode: String(body?.postalCode ?? ""),
      orderSubtotal: Number(body?.orderSubtotal ?? 0),
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not test shipping rate"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

