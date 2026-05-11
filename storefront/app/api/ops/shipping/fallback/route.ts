import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { FALLBACK_ZONE_CODE, getFallbackSettings, updateShippingZone } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requireOpsUserId()
    return NextResponse.json(await getFallbackSettings())
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load fallback settings", 401)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const { zone } = await getFallbackSettings()
    if (!zone) return jsonError(`${FALLBACK_ZONE_CODE} does not exist`, 404)
    const updated = await updateShippingZone(zone.id, await request.json(), userId)
    return NextResponse.json({ zone: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update fallback settings"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

