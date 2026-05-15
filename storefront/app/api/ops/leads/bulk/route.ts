import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { deleteLeadsForPortal } from "../../../../../lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    await requireOpsUserId()
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown }
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : []
    const result = await deleteLeadsForPortal(ids)
    if (result.ok) {
      return NextResponse.json({ ok: true, deletedCount: result.deletedCount })
    }
    if (result.error === "not_configured") {
      return jsonError("Leads DB not configured", 503)
    }
    if (result.error === "not_found") {
      return jsonError("No matching leads found", 404)
    }
    return jsonError(result.message || "Could not delete selected leads", 500)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete leads"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
