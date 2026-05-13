import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { bulkUpdateShippingZoneRates } from "../../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const body = await request.json()
    const summary = await bulkUpdateShippingZoneRates(body, userId)
    return NextResponse.json({ summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not bulk update zones"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
