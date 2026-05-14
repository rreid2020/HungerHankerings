type HogqlResponse = {
  columns?: string[]
  results?: unknown[]
  error?: string
}

type TrafficPoint = {
  label: string
  value: number
}

export type OpsTrafficDashboardData = {
  configured: boolean
  requires: string[]
  visitors30d: number
  sessions30d: number
  pageviews30d: number
  beginCheckout30d: number
  purchases30d: number
  leads30d: number
  checkoutToPurchaseRatePct: number
  visitorToLeadRatePct: number
  topPages: TrafficPoint[]
  topSources: TrafficPoint[]
  error?: string
}

function getPosthogConfig() {
  const host = (
    process.env.POSTHOG_HOST?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    "https://us.i.posthog.com"
  ).replace(/\/+$/, "")
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || ""
  const apiKey =
    process.env.POSTHOG_PERSONAL_API_KEY?.trim() || process.env.POSTHOG_API_KEY?.trim() || ""
  return { host, projectId, apiKey }
}

function requiredConfigMissing(): string[] {
  const { projectId, apiKey } = getPosthogConfig()
  const missing: string[] = []
  if (!projectId) missing.push("POSTHOG_PROJECT_ID")
  if (!apiKey) missing.push("POSTHOG_PERSONAL_API_KEY")
  return missing
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function mapRows(response: HogqlResponse): Record<string, unknown>[] {
  const columns = Array.isArray(response.columns) ? response.columns : []
  const rows = Array.isArray(response.results) ? response.results : []
  return rows
    .map((row) => {
      if (!Array.isArray(row)) return null
      const out: Record<string, unknown> = {}
      for (let i = 0; i < columns.length; i += 1) {
        out[columns[i]] = row[i]
      }
      return out
    })
    .filter((row): row is Record<string, unknown> => row !== null)
}

async function runHogql(query: string): Promise<Record<string, unknown>[]> {
  const { host, projectId, apiKey } = getPosthogConfig()
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`PostHog query failed (${response.status}): ${body.slice(0, 200)}`)
  }

  const payload = (await response.json()) as HogqlResponse
  if (payload.error) throw new Error(payload.error)
  return mapRows(payload)
}

export async function loadOpsTrafficDashboard(): Promise<OpsTrafficDashboardData> {
  const missing = requiredConfigMissing()
  if (missing.length > 0) {
    return {
      configured: false,
      requires: missing,
      visitors30d: 0,
      sessions30d: 0,
      pageviews30d: 0,
      beginCheckout30d: 0,
      purchases30d: 0,
      leads30d: 0,
      checkoutToPurchaseRatePct: 0,
      visitorToLeadRatePct: 0,
      topPages: [],
      topSources: [],
    }
  }

  try {
    const [coreRows, pageRows, sourceRows, funnelRows] = await Promise.all([
      runHogql(`
        SELECT
          countIf(event = '$pageview') AS pageviews_30d,
          uniqIf(distinct_id, event = '$pageview') AS visitors_30d,
          uniqIf(properties.$session_id, event = '$pageview' AND properties.$session_id IS NOT NULL) AS sessions_30d
        FROM events
        WHERE timestamp >= now() - INTERVAL 30 DAY
      `),
      runHogql(`
        SELECT
          coalesce(
            nullIf(properties.path, ''),
            nullIf(properties.$pathname, ''),
            nullIf(properties.$current_url, ''),
            '(unknown)'
          ) AS page,
          count() AS visits
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY page
        ORDER BY visits DESC
        LIMIT 8
      `),
      runHogql(`
        SELECT
          coalesce(nullIf(properties.$referring_domain, ''), 'direct') AS source,
          count() AS visits
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 8
      `),
      runHogql(`
        SELECT
          countIf(event = 'begin_checkout') AS begin_checkout_30d,
          countIf(event = 'purchase_complete') AS purchases_30d,
          countIf(event = 'lead_submit') AS leads_30d
        FROM events
        WHERE timestamp >= now() - INTERVAL 30 DAY
      `),
    ])

    const core = coreRows[0] ?? {}
    const funnel = funnelRows[0] ?? {}
    const visitors30d = toNumber(core.visitors_30d)
    const sessions30d = toNumber(core.sessions_30d)
    const pageviews30d = toNumber(core.pageviews_30d)
    const beginCheckout30d = toNumber(funnel.begin_checkout_30d)
    const purchases30d = toNumber(funnel.purchases_30d)
    const leads30d = toNumber(funnel.leads_30d)

    const checkoutToPurchaseRatePct =
      beginCheckout30d > 0 ? Number(((purchases30d / beginCheckout30d) * 100).toFixed(1)) : 0
    const visitorToLeadRatePct =
      visitors30d > 0 ? Number(((leads30d / visitors30d) * 100).toFixed(1)) : 0

    return {
      configured: true,
      requires: [],
      visitors30d,
      sessions30d,
      pageviews30d,
      beginCheckout30d,
      purchases30d,
      leads30d,
      checkoutToPurchaseRatePct,
      visitorToLeadRatePct,
      topPages: pageRows.map((row) => ({
        label: String(row.page ?? "(unknown)"),
        value: toNumber(row.visits),
      })),
      topSources: sourceRows.map((row) => ({
        label: String(row.source ?? "direct"),
        value: toNumber(row.visits),
      })),
    }
  } catch (error) {
    return {
      configured: true,
      requires: [],
      visitors30d: 0,
      sessions30d: 0,
      pageviews30d: 0,
      beginCheckout30d: 0,
      purchases30d: 0,
      leads30d: 0,
      checkoutToPurchaseRatePct: 0,
      visitorToLeadRatePct: 0,
      topPages: [],
      topSources: [],
      error: error instanceof Error ? error.message : "PostHog query failed",
    }
  }
}
