import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { importFsaRegionsCsv, importShippingZonesCsv } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const contentType = request.headers.get("content-type") ?? ""
    let csv = ""
    let type = request.nextUrl.searchParams.get("type")?.trim().toLowerCase() ?? "regions"
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      const incomingType = form.get("type")
      if (typeof incomingType === "string" && incomingType.trim()) {
        type = incomingType.trim().toLowerCase()
      }
      if (file instanceof Blob) {
        csv = await file.text()
      } else if (typeof file === "string") {
        csv = file
      }
    } else {
      csv = await request.text()
    }
    if (!csv.trim()) return jsonError("CSV file is required")
    if (type !== "regions" && type !== "zones") {
      return jsonError("type must be regions or zones")
    }
    const summary =
      type === "zones"
        ? await importShippingZonesCsv(csv, userId)
        : await importFsaRegionsCsv(csv, userId)
    return NextResponse.json({ summary, type })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not import CSV"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

