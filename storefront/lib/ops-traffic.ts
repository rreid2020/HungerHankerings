type HogqlResponse = {
  columns?: string[]
  results?: unknown[]
  error?: string
}

type TrafficPoint = {
  label: string
  views: number
  visitors: number
}

type TrafficTrendPoint = {
  day: string
  visitors: number
  sessions: number
  pageviews: number
  leads: number
  purchases: number
}

export type OpsTrafficDashboardData = {
  configured: boolean
  requires: string[]
  periodDays: 7 | 30 | 90
  visitors: number
  sessions: number
  pageviews: number
  beginCheckout: number
  purchases: number
  leads: number
  pagesPerSession: number
  checkoutToPurchaseRatePct: number
  visitorToLeadRatePct: number
  prevVisitors: number
  prevSessions: number
  prevPageviews: number
  prevLeads: number
  prevPurchases: number
  topPages: TrafficPoint[]
  topSources: TrafficPoint[]
  topBrowsers: TrafficPoint[]
  topDevices: TrafficPoint[]
  trend: TrafficTrendPoint[]
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

function clampDays(input?: number): 7 | 30 | 90 {
  if (input === 7 || input === 30 || input === 90) return input
  return 30
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

function pct(value: number, total: number): number {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0
}

export async function loadOpsTrafficDashboard(periodDays?: number): Promise<OpsTrafficDashboardData> {
  const days = clampDays(periodDays)
  const missing = requiredConfigMissing()
  if (missing.length > 0) {
    return {
      configured: false,
      requires: missing,
      periodDays: days,
      visitors: 0,
      sessions: 0,
      pageviews: 0,
      beginCheckout: 0,
      purchases: 0,
      leads: 0,
      pagesPerSession: 0,
      checkoutToPurchaseRatePct: 0,
      visitorToLeadRatePct: 0,
      prevVisitors: 0,
      prevSessions: 0,
      prevPageviews: 0,
      prevLeads: 0,
      prevPurchases: 0,
      topPages: [],
      topSources: [],
      topBrowsers: [],
      topDevices: [],
      trend: [],
    }
  }

  try {
    const [coreRows, previousRows, pageRows, sourceRows, browserRows, deviceRows, trendRows] = await Promise.all([
      runHogql(`
        SELECT
          countIf(event = '$pageview') AS pageviews,
          uniqIf(distinct_id, event = '$pageview') AS visitors,
          uniqIf(properties.$session_id, event = '$pageview' AND properties.$session_id IS NOT NULL) AS sessions,
          countIf(event = 'begin_checkout') AS begin_checkout,
          countIf(event = 'purchase_complete') AS purchases,
          countIf(event = 'lead_submit') AS leads
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
      `),
      runHogql(`
        SELECT
          countIf(event = '$pageview') AS pageviews,
          uniqIf(distinct_id, event = '$pageview') AS visitors,
          uniqIf(properties.$session_id, event = '$pageview' AND properties.$session_id IS NOT NULL) AS sessions,
          countIf(event = 'purchase_complete') AS purchases,
          countIf(event = 'lead_submit') AS leads
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days * 2} DAY
          AND timestamp < now() - INTERVAL ${days} DAY
      `),
      runHogql(`
        SELECT
          coalesce(
            nullIf(properties.$pathname, ''),
            nullIf(properties.path, ''),
            nullIf(properties.$current_url, ''),
            '(unknown)'
          ) AS label,
          count() AS views,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY label
        ORDER BY views DESC
        LIMIT 10
      `),
      runHogql(`
        SELECT
          coalesce(nullIf(properties.$referring_domain, ''), 'direct') AS label,
          count() AS views,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY label
        ORDER BY views DESC
        LIMIT 10
      `),
      runHogql(`
        SELECT
          coalesce(nullIf(properties.$browser, ''), 'Unknown') AS label,
          count() AS views,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY label
        ORDER BY views DESC
        LIMIT 8
      `),
      runHogql(`
        SELECT
          coalesce(nullIf(properties.$device_type, ''), 'Unknown') AS label,
          count() AS views,
          uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY label
        ORDER BY views DESC
        LIMIT 8
      `),
      runHogql(`
        SELECT
          toString(toDate(timestamp)) AS day,
          countIf(event = '$pageview') AS pageviews,
          uniqIf(distinct_id, event = '$pageview') AS visitors,
          uniqIf(properties.$session_id, event = '$pageview' AND properties.$session_id IS NOT NULL) AS sessions,
          countIf(event = 'lead_submit') AS leads,
          countIf(event = 'purchase_complete') AS purchases
        FROM events
        WHERE timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY day
        ORDER BY day ASC
      `),
    ])

    const core = coreRows[0] ?? {}
    const prev = previousRows[0] ?? {}
    const visitors = toNumber(core.visitors)
    const sessions = toNumber(core.sessions)
    const pageviews = toNumber(core.pageviews)
    const beginCheckout = toNumber(core.begin_checkout)
    const purchases = toNumber(core.purchases)
    const leads = toNumber(core.leads)

    return {
      configured: true,
      requires: [],
      periodDays: days,
      visitors,
      sessions,
      pageviews,
      beginCheckout,
      purchases,
      leads,
      pagesPerSession: sessions > 0 ? Number((pageviews / sessions).toFixed(2)) : 0,
      checkoutToPurchaseRatePct: pct(purchases, beginCheckout),
      visitorToLeadRatePct: pct(leads, visitors),
      prevVisitors: toNumber(prev.visitors),
      prevSessions: toNumber(prev.sessions),
      prevPageviews: toNumber(prev.pageviews),
      prevLeads: toNumber(prev.leads),
      prevPurchases: toNumber(prev.purchases),
      topPages: pageRows.map((row) => ({
        label: String(row.label ?? "(unknown)"),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      topSources: sourceRows.map((row) => ({
        label: String(row.label ?? "direct"),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      topBrowsers: browserRows.map((row) => ({
        label: String(row.label ?? "Unknown"),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      topDevices: deviceRows.map((row) => ({
        label: String(row.label ?? "Unknown"),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      trend: trendRows.map((row) => ({
        day: String(row.day ?? ""),
        visitors: toNumber(row.visitors),
        sessions: toNumber(row.sessions),
        pageviews: toNumber(row.pageviews),
        leads: toNumber(row.leads),
        purchases: toNumber(row.purchases),
      })),
    }
  } catch (error) {
    const days = clampDays(periodDays)
    return {
      configured: true,
      requires: [],
      periodDays: days,
      visitors: 0,
      sessions: 0,
      pageviews: 0,
      beginCheckout: 0,
      purchases: 0,
      leads: 0,
      pagesPerSession: 0,
      checkoutToPurchaseRatePct: 0,
      visitorToLeadRatePct: 0,
      prevVisitors: 0,
      prevSessions: 0,
      prevPageviews: 0,
      prevLeads: 0,
      prevPurchases: 0,
      topPages: [],
      topSources: [],
      topBrowsers: [],
      topDevices: [],
      trend: [],
      error: error instanceof Error ? error.message : "PostHog query failed",
    }
  }
}
