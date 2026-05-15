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
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Contact form submissions from <code className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-800">POST /api/leads</code>
          . Row details live in the <code className="text-slate-700">payload</code> JSON column (
          <span className="text-slate-500">reason, name, email, company, phone, message</span> for inquiries).
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
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          <p className="font-medium text-slate-900">No lead messages yet.</p>
          <p className="mt-2">
            This inbox is currently empty. If you expected messages, confirm production uses the <strong>same</strong>{" "}
            database you opened in pgAdmin (
            <code className="rounded bg-slate-200 px-1 text-slate-800">hungerhankeringsadmin</code>), not{" "}
            <code className="rounded bg-slate-200 px-1 text-slate-800">vendure</code>.
          </p>
        </div>
      ) : null}

      {result.ok === true && result.leads.length > 0 ? <OpsLeadsTableClient initialLeads={result.leads} /> : null}
    </div>
  )
}
