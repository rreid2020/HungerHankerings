import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getInquiryReasonLabel, isInquiryReason } from "../../../../lib/contact-inquiry"
import { listLeadsForPortal } from "../../../../lib/db"

export const dynamic = "force-dynamic"

function payloadStr(payload: Record<string, unknown>, key: string): string {
  const v = payload[key]
  if (v == null) return "—"
  const s = String(v).trim()
  return s || "—"
}

function reasonLabel(payload: Record<string, unknown>): string {
  const r = payload.reason
  if (typeof r === "string" && isInquiryReason(r)) {
    return getInquiryReasonLabel(r)
  }
  return typeof r === "string" ? r : "—"
}

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

      {result.ok === true && result.leads.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                <th className="whitespace-nowrap px-3 py-3 font-medium">Received</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium">Type</th>
                <th className="min-w-[160px] px-3 py-3 font-medium">Reason</th>
                <th className="min-w-[120px] px-3 py-3 font-medium">Name</th>
                <th className="min-w-[180px] px-3 py-3 font-medium">Email</th>
                <th className="min-w-[100px] px-3 py-3 font-medium">Company</th>
                <th className="min-w-[120px] px-3 py-3 font-medium">Phone</th>
                <th className="min-w-[220px] px-3 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="text-zinc-200">
              {result.leads.map((row) => {
                const { payload } = row
                const email = payloadStr(payload, "email")
                const msg = payloadStr(payload, "message")
                const msgShort = msg.length > 120 ? `${msg.slice(0, 117)}…` : msg
                return (
                  <tr key={row.id} className="border-b border-zinc-800/90 align-top hover:bg-zinc-900/60">
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-400">
                      {row.createdAt.toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-zinc-300">{row.type}</td>
                    <td className="px-3 py-3 text-zinc-300">{reasonLabel(payload)}</td>
                    <td className="px-3 py-3">{payloadStr(payload, "name")}</td>
                    <td className="break-all px-3 py-3">
                      {email !== "—" ? (
                        <a href={`mailto:${email}`} className="text-brand-400 underline-offset-2 hover:underline">
                          {email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{payloadStr(payload, "company")}</td>
                    <td className="px-3 py-3 text-zinc-400">{payloadStr(payload, "phone")}</td>
                    <td className="max-w-md px-3 py-3 text-zinc-400" title={msg !== "—" ? msg : undefined}>
                      {msgShort}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
