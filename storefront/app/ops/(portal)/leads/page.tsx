import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { listLeadsForPortal } from "../../../../lib/db"
import OpsLeadsTableClient from "../../../../components/ops/OpsLeadsTableClient"

export const dynamic = "force-dynamic"

export default async function OpsLeadsPage() {
  const result = await listLeadsForPortal(200)

  return (
    <div className="space-y-6">
      <Link
        href="/ops"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Contact form submissions from <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">POST /api/leads</code>
          . Row details live in the <code className="text-zinc-300">payload</code> JSON column (
          <span className="text-zinc-500">reason, name, email, company, phone, message</span> for inquiries).
        </p>
      </div>

      {result.ok === false && result.error === "not_configured" ? (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Leads DB not configured (<code className="text-amber-50">LEADS_DATABASE_URL</code>, or{" "}
          <code className="text-amber-50">DB_*</code> + <code className="text-amber-50">LEADS_DATABASE_NAME</code>, or{" "}
          <code className="text-amber-50">DATABASE_URL</code>). Catalog/checkout still use Vendure HTTP — only this inbox
          needs your ops DB (e.g. <code className="text-amber-50">hungerhankeringsadmin</code>).
        </div>
      ) : null}

      {result.ok === false && result.error === "query_failed" ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          Could not query leads. Check{" "}
          <code className="text-red-50">LEADS_DATABASE_*</code> / <code className="text-red-50">DATABASE_URL</code>, VPC
          egress, and Postgres trusted sources.{" "}
          {result.message ? (
            <span className="mt-1 block font-mono text-xs text-red-200/90">{result.message}</span>
          ) : null}
        </div>
      ) : null}

      {result.ok === true && result.leads.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">No rows yet.</p>
          <p className="mt-2">
            If submissions should appear here, confirm production uses the <strong>same</strong> database you opened in
            pgAdmin (<code className="rounded bg-zinc-800 px-1 text-zinc-200">hungerhankeringsadmin</code>), not{" "}
            <code className="rounded bg-zinc-800 px-1 text-zinc-200">vendure</code>. Check runtime logs for{" "}
            <code className="text-zinc-300">Lead submission: database error</code> or connection timeouts.
          </p>
        </div>
      ) : null}

      {result.ok === true && result.leads.length > 0 ? <OpsLeadsTableClient initialLeads={result.leads} /> : null}
    </div>
  )
}
