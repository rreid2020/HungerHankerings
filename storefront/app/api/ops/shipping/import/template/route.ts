import { NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { buildFsaImportTemplateCsv, buildZoneImportTemplateCsv } from "../../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    await requireOpsUserId()
    const url = new URL(request.url)
    const type = url.searchParams.get("type")?.trim().toLowerCase() ?? "regions"
    if (type !== "regions" && type !== "zones") {
      return jsonError("type must be regions or zones")
    }
    const csv = type === "zones" ? buildZoneImportTemplateCsv() : buildFsaImportTemplateCsv()
    const fileName = type === "zones" ? "shipping-zones-template.csv" : "shipping-fsa-template.csv"
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate CSV template"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
