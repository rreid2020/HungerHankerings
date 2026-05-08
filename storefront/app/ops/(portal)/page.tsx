import Link from "next/link"
import { ArrowRight, Inbox, Shield } from "lucide-react"
import { getVendureAdminUrl } from "../../../lib/ops-host"

export default function OpsDashboardPage() {
  const vendureAdmin = getVendureAdminUrl()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Operations</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Internal tools for Hunger Hankerings. Use{" "}
          <strong className="text-zinc-300">Vendure Admin</strong> for catalog, orders, and customers;
          this portal is for Next-hosted workflows (starting with leads).
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/ops/leads"
            className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-brand-500/40 hover:bg-zinc-900"
          >
            <Inbox className="h-8 w-8 text-brand-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-white">Leads</span>
            <span className="mt-1 text-sm text-zinc-400">
              Contact and inquiry submissions (database-backed API).
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
            className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
          >
            <Shield className="h-8 w-8 text-zinc-400" aria-hidden />
            <span className="mt-3 text-lg font-medium text-white">Vendure Admin</span>
            <span className="mt-1 text-sm text-zinc-400">
              Commerce backend on the primary site (opens in a new tab).
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-300">
              Open in new tab
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </a>
        </li>
      </ul>
    </div>
  )
}
