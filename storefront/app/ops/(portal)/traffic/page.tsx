import Link from "next/link"
import { BarChart3, TrendingUp } from "lucide-react"
import { loadOpsTrafficDashboard } from "../../../../lib/ops-traffic"

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ window?: string }>

function parseWindow(raw?: string): 7 | 30 | 90 {
  if (raw === "7") return 7
  if (raw === "90") return 90
  return 30
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number | null
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {delta != null ? (
        <p className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}% vs previous period
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">No prior-period baseline</p>
      )}
    </div>
  )
}

function TrendChart({
  labels,
  values,
  stroke,
}: {
  labels: string[]
  values: number[]
  stroke: string
}) {
  if (values.length === 0) {
    return <p className="text-sm text-slate-500">No trend data yet.</p>
  }
  const max = Math.max(...values, 1)
  const width = 760
  const height = 220
  const points = values
    .map((v, i) => {
      const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width
      const y = height - (v / max) * (height - 24) - 12
      return `${x},${y}`
    })
    .join(" ")
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Traffic trend chart"
        className="h-56 w-full rounded-md bg-slate-50"
      >
        <polyline fill="none" stroke={stroke} strokeWidth="3" points={points} />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  )
}

function TopList({
  title,
  rows,
}: {
  title: string
  rows: { label: string; views: number; visitors: number }[]
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet.</p>
        ) : (
          rows.map((row) => (
            <div key={`${title}-${row.label}`} className="rounded border border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{row.label}</span>
                <span className="font-medium text-slate-900 tabular-nums">{row.views.toLocaleString()} views</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{row.visitors.toLocaleString()} visitors</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default async function OpsTrafficPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const windowDays = parseWindow(params.window)
  const data = await loadOpsTrafficDashboard(windowDays)
  const visitorsDelta = pctDelta(data.visitors, data.prevVisitors)
  const sessionsDelta = pctDelta(data.sessions, data.prevSessions)
  const pageviewsDelta = pctDelta(data.pageviews, data.prevPageviews)
  const leadsDelta = pctDelta(data.leads, data.prevLeads)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <BarChart3 className="h-6 w-6 text-brand-500" aria-hidden />
          Traffic Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          PostHog-backed analytics with trend charts, conversion rates, and traffic breakdowns.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((days) => {
          const active = data.periodDays === days
          return (
            <Link
              key={days}
              href={`/ops/traffic?window=${days}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Last {days} days
            </Link>
          )
        })}
      </div>

      {!data.configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">PostHog dashboard data is not fully configured yet.</p>
          <p className="mt-1">
            Add these server env vars to load analytics in Ops:{" "}
            <code>{data.requires.join(", ")}</code>
          </p>
        </div>
      ) : null}

      {data.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load PostHog metrics: <code>{data.error}</code>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Visitors (${data.periodDays}d)`} value={data.visitors.toLocaleString()} delta={visitorsDelta} />
        <StatCard label={`Sessions (${data.periodDays}d)`} value={data.sessions.toLocaleString()} delta={sessionsDelta} />
        <StatCard
          label={`Pageviews (${data.periodDays}d)`}
          value={data.pageviews.toLocaleString()}
          delta={pageviewsDelta}
        />
        <StatCard label={`Leads (${data.periodDays}d)`} value={data.leads.toLocaleString()} delta={leadsDelta} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Begin Checkout" value={data.beginCheckout.toLocaleString()} />
        <StatCard label="Purchases" value={data.purchases.toLocaleString()} />
        <StatCard label="Checkout → Purchase" value={`${data.checkoutToPurchaseRatePct}%`} />
        <StatCard label="Visitor → Lead" value={`${data.visitorToLeadRatePct}%`} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-500" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Traffic Trend</h2>
        </div>
        <TrendChart
          labels={data.trend.map((row) => row.day)}
          values={data.trend.map((row) => row.pageviews)}
          stroke="#f43f5e"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Pages / session</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{data.pagesPerSession}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Previous visitors</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
              {data.prevVisitors.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Previous pageviews</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
              {data.prevPageviews.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TopList title="Top Pages" rows={data.topPages} />
        <TopList title="Traffic Sources" rows={data.topSources} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TopList title="Top Browsers" rows={data.topBrowsers} />
        <TopList title="Top Devices" rows={data.topDevices} />
      </section>
    </div>
  )
}
