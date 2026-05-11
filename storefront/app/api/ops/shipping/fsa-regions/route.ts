import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { createFsaRegion, listFsaRegions } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await requireOpsUserId()
    return NextResponse.json({ regions: await listFsaRegions(request.nextUrl.searchParams) })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load FSA regions", 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const body = await request.json()
    const region = await createFsaRegion(body, userId)
    return NextResponse.json({ region })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create FSA region"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

