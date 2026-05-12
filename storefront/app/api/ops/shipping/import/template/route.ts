import { NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { buildFsaImportTemplateCsv } from "../../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requireOpsUserId()
    const csv = buildFsaImportTemplateCsv()
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="shipping-fsa-template.csv"',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate CSV template"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
