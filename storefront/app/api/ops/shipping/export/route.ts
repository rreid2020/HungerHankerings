import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { exportShippingCsv } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await requireOpsUserId()
    const type = request.nextUrl.searchParams.get("type")
    if (type !== "zones" && type !== "regions" && type !== "overrides") {
      return jsonError("type must be zones, regions, or overrides")
    }
    const csv = await exportShippingCsv(type, request.nextUrl.searchParams)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shipping-${type}.csv"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not export CSV"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
