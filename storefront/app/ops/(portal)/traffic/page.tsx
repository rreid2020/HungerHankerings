import { BarChart3 } from "lucide-react"
import { loadOpsTrafficDashboard } from "../../../../lib/ops-traffic"

export const dynamic = "force-dynamic"

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default async function OpsTrafficPage() {
  const data = await loadOpsTrafficDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <BarChart3 className="h-6 w-6 text-brand-500" aria-hidden />
          Traffic Analytics
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Last 30 days from PostHog page views and storefront events.
        </p>
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
        <StatCard label="Visitors (30d)" value={data.visitors30d.toLocaleString()} />
        <StatCard label="Sessions (30d)" value={data.sessions30d.toLocaleString()} />
        <StatCard label="Pageviews (30d)" value={data.pageviews30d.toLocaleString()} />
        <StatCard label="Leads (30d)" value={data.leads30d.toLocaleString()} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Begin Checkout" value={data.beginCheckout30d.toLocaleString()} />
        <StatCard label="Purchases" value={data.purchases30d.toLocaleString()} />
        <StatCard label="Checkout → Purchase" value={`${data.checkoutToPurchaseRatePct}%`} />
        <StatCard label="Visitor → Lead" value={`${data.visitorToLeadRatePct}%`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Top Pages</h2>
          <div className="mt-3 space-y-2">
            {data.topPages.length === 0 ? (
              <p className="text-sm text-slate-500">No page view data yet.</p>
            ) : (
              data.topPages.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-700">{row.label}</span>
                  <span className="font-medium text-slate-900">{row.value.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Traffic Sources</h2>
          <div className="mt-3 space-y-2">
            {data.topSources.length === 0 ? (
              <p className="text-sm text-slate-500">No source data yet.</p>
            ) : (
              data.topSources.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-700">{row.label}</span>
                  <span className="font-medium text-slate-900">{row.value.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
