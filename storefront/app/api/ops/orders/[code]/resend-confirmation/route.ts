import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../../../lib/ops-api-auth"
import { resendOrderConfirmationEmail } from "../../../../../../lib/vendure-admin"

export const runtime = "nodejs"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    await requireOpsUserId()
    const { code } = await params
    const result = await resendOrderConfirmationEmail(code)

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        message: result.message,
        orderCode: result.orderCode,
        recipientEmail: result.recipientEmail,
      })
    }

    if (result.reason === "not_configured") {
      return jsonError(result.message, 503)
    }
    if (result.reason === "not_eligible") {
      return jsonError(result.message, 400)
    }
    return jsonError(result.message, 500)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resend confirmation"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
