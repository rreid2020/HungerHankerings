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
    const serverHost = normalizeHost(process.env.POSTHOG_HOST?.trim() || publicHost)
    const source =
      process.env.POSTHOG_PERSONAL_API_KEY?.trim()
        ? "POSTHOG_PERSONAL_API_KEY"
        : process.env.POSTHOG_API_KEY?.trim()
          ? "POSTHOG_API_KEY"
          : ""

    let authProbe: {
      attempted: boolean
      ok: boolean
      status: number | null
      endpoint: string
      detail: string
    } = {
      attempted: false,
      ok: false,
      status: null,
      endpoint: "",
      detail: "Missing POSTHOG_HOST/NEXT_PUBLIC_POSTHOG_HOST, POSTHOG_PROJECT_ID, or personal API key.",
    }

    if (serverHost && projectId && personalApiKey) {
      const endpoint = `${serverHost}/api/projects/${projectId}/`
      authProbe.endpoint = endpoint
      authProbe.attempted = true
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${personalApiKey}`,
          },
          cache: "no-store",
        })
        authProbe.status = res.status
        if (res.ok) {
          authProbe.ok = true
          authProbe.detail = "PostHog API auth succeeded."
        } else {
          const body = await res.text().catch(() => "")
          authProbe.detail = body.slice(0, 300) || `PostHog API auth failed (${res.status}).`
        }
      } catch (probeErr) {
        authProbe.detail = probeErr instanceof Error ? probeErr.message : "Auth probe failed."
      }
    }

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
          looksLikePersonalKey: /^ph[ux]_/.test(personalApiKey),
          source,
        },
      },
      checks: {
        storefrontClientReady: Boolean(publicKey && publicHost),
        opsDashboardReady: Boolean(publicHost && projectId && personalApiKey),
      },
      authProbe,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read env status"
    return jsonError(message, message === "Unauthorized" ? 401 : 400)
  }
}
