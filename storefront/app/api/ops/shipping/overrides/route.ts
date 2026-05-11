import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../lib/ops-api-auth"
import { createFsaOverride, listFsaOverrides } from "../../../../../lib/shipping-rates"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requireOpsUserId()
    return NextResponse.json({ overrides: await listFsaOverrides() })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load FSA overrides", 401)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireOpsUserId()
    const body = await request.json()
    const override = await createFsaOverride(body, userId)
    return NextResponse.json({ override })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create FSA override"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}

