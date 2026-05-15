import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { deleteLeadForPortal } from "../../../../../lib/db"

export const runtime = "nodejs"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireOpsUserId()
    const { id } = await params
    const result = await deleteLeadForPortal(id)
    if (result.ok) {
      return NextResponse.json({ ok: true })
    }
    if (result.error === "not_configured") {
      return jsonError("Leads DB not configured", 503)
    }
    if (result.error === "not_found") {
      return jsonError("Lead not found", 404)
    }
    return jsonError(result.message || "Could not delete lead", 500)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete lead"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
