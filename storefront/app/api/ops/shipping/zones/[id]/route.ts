import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { deleteShippingZone, updateShippingZone } from "../../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireOpsUserId()
    const { id } = await context.params
    const body = await request.json()
    const zone = await updateShippingZone(id, body, userId)
    return NextResponse.json({ zone })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update zone"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireOpsUserId()
    const { id } = await context.params
    return NextResponse.json(await deleteShippingZone(id, userId))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete zone"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

