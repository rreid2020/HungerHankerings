import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function OpsLeadsPage() {
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
          Submissions are stored via <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">POST /api/leads</code>{" "}
          and the <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">DATABASE_URL</code> ops database.
          A read-only inbox UI can be added here (table, filters, CSV export).
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-12 text-center text-sm text-zinc-500">
        Lead inbox UI — scaffold. Query <code className="text-zinc-400">leads</code> from the ops DB when you are
        ready.
      </div>
    </div>
  )
}
