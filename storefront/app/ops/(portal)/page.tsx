import Link from "next/link"
import { ArrowRight, BarChart3, Inbox, Shield, ShoppingBag } from "lucide-react"
import { getVendureAdminUrl } from "../../../lib/ops-host"

export default function OpsDashboardPage() {
  const vendureAdmin = getVendureAdminUrl()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Operations</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Internal tools for Hunger Hankerings. Use{" "}
          <strong className="text-slate-700">Vendure Admin</strong> for catalog, orders, and customers;
          this portal is for Next-hosted workflows (starting with leads).
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li>
          <Link
            href="/ops/leads"
            className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:bg-slate-50"
          >
            <Inbox className="h-8 w-8 text-brand-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-slate-900">Leads</span>
            <span className="mt-1 text-sm text-slate-600">
              Contact and inquiry submissions (database-backed API).
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-400">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/ops/traffic"
            className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:bg-slate-50"
          >
            <BarChart3 className="h-8 w-8 text-brand-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-slate-900">Traffic</span>
            <span className="mt-1 text-sm text-slate-600">
              Website traffic, top pages, and conversion events from PostHog.
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-400">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/ops/commerce"
            className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:bg-slate-50"
          >
            <ShoppingBag className="h-8 w-8 text-brand-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-slate-900">Commerce</span>
            <span className="mt-1 text-sm text-slate-600">
              Orders snapshot, product count, and customer count from Vendure.
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-400">
              Open
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </li>
        <li>
          <a
            href={vendureAdmin}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Shield className="h-8 w-8 text-slate-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-slate-900">Vendure Admin</span>
            <span className="mt-1 text-sm text-slate-600">
              Commerce backend on the primary site (opens in a new tab).
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
              Open in new tab
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </a>
        </li>
      </ul>
    </div>
  )
}
