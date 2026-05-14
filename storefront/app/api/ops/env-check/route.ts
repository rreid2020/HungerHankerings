import { NextResponse } from "next/server"
import { jsonError, requireOpsUserId } from "../../../../lib/ops-api-auth"

export const runtime = "nodejs"

function maskSecret(value: string): string {
  if (!value) return ""
  if (value.length <= 8) return `${value.slice(0, 2)}***`
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function normalizeHost(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export async function GET() {
  try {
    await requireOpsUserId()

    const publicKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""
    const publicHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ?? ""
    const projectId = process.env.POSTHOG_PROJECT_ID?.trim() ?? ""
    const personalApiKey =
      process.env.POSTHOG_PERSONAL_API_KEY?.trim() || process.env.POSTHOG_API_KEY?.trim() || ""

    return NextResponse.json({
      ok: true,
      runtime: "nodejs",
      posthog: {
        nextPublicKey: {
          present: Boolean(publicKey),
          masked: maskSecret(publicKey),
          looksLikeProjectKey: publicKey.startsWith("phc_"),
        },
        nextPublicHost: {
          present: Boolean(publicHost),
          value: publicHost ? normalizeHost(publicHost) : "",
        },
        projectId: {
          present: Boolean(projectId),
          value: projectId,
          numeric: /^\d+$/.test(projectId),
        },
        personalApiKey: {
          present: Boolean(personalApiKey),
          masked: maskSecret(personalApiKey),
          looksLikePersonalKey: personalApiKey.startsWith("phu_"),
          source: process.env.POSTHOG_PERSONAL_API_KEY?.trim() ? "POSTHOG_PERSONAL_API_KEY" : process.env.POSTHOG_API_KEY?.trim() ? "POSTHOG_API_KEY" : "",
        },
      },
      checks: {
        storefrontClientReady: Boolean(publicKey && publicHost),
        opsDashboardReady: Boolean(publicHost && projectId && personalApiKey),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read env status"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
