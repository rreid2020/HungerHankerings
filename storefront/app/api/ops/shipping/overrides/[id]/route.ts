import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { deleteFsaOverride, updateFsaOverride } from "../../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireOpsUserId()
    const { id } = await context.params
    const body = await request.json()
    const override = await updateFsaOverride(id, body, userId)
    return NextResponse.json({ override })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update FSA override"
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
    return NextResponse.json(await deleteFsaOverride(id, userId))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete FSA override"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

