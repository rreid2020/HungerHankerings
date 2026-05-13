import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { createShippingZone, listShippingZones } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await requireOpsUserId()
    return NextResponse.json({ zones: await listShippingZones(request.nextUrl.searchParams) })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load zones", 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const body = await request.json()
    const zone = await createShippingZone(body, userId)
    return NextResponse.json({ zone })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create zone"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

