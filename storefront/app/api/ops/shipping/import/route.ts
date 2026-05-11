import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { importFsaRegionsCsv } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const contentType = request.headers.get("content-type") ?? ""
    let csv = ""
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (file instanceof Blob) {
        csv = await file.text()
      } else if (typeof file === "string") {
        csv = file
      }
    } else {
      csv = await request.text()
    }
    if (!csv.trim()) return jsonError("CSV file is required")
    const summary = await importFsaRegionsCsv(csv, userId)
    return NextResponse.json({ summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not import CSV"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

