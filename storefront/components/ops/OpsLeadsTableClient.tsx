"use client"

import { useMemo, useState } from "react"
import { Trash2 } from "lucide-react"
import { getInquiryReasonLabel, isInquiryReason } from "../../lib/contact-inquiry"
import type { PortalLeadRow } from "../../lib/db"

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

export default function OpsLeadsTableClient({ initialLeads }: { initialLeads: PortalLeadRow[] }) {
  const [rows, setRows] = useState<PortalLeadRow[]>(initialLeads)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const hasRows = useMemo(() => rows.length > 0, [rows.length])
  const selectedCount = selectedIds.length
  const allSelected = hasRows && selectedCount === rows.length
  const hasSelection = selectedCount > 0

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === rows.length ? [] : rows.map((row) => row.id)))
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this lead message? This cannot be undone.")
    if (!ok) return
    setError(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/ops/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Delete failed (${res.status})`)
      }
      setRows((prev) => prev.filter((row) => row.id !== id))
      setSelectedIds((prev) => prev.filter((x) => x !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete lead.")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBulkDelete() {
    if (!hasSelection) return
    const ok = window.confirm(`Delete ${selectedCount} selected lead message(s)? This cannot be undone.`)
    if (!ok) return
    setError(null)
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/ops/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Bulk delete failed (${res.status})`)
      }
      const selected = new Set(selectedIds)
      setRows((prev) => prev.filter((row) => !selected.has(row.id)))
      setSelectedIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete selected leads.")
    } finally {
      setBulkDeleting(false)
    }
  }

  if (!hasRows) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-6 text-sm text-zinc-400">
        <p className="font-medium text-zinc-300">No rows yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300">
        <span>
          {hasSelection ? `${selectedCount} selected` : "Select rows to delete multiple leads at once"}
        </span>
        <button
          type="button"
          onClick={() => void handleBulkDelete()}
          disabled={!hasSelection || bulkDeleting || Boolean(deletingId)}
          className="inline-flex items-center gap-1 rounded-md border border-red-700/70 bg-red-950/30 px-2.5 py-1.5 text-xs text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
          title="Delete selected leads"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {bulkDeleting ? "Deleting selected..." : "Delete selected"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/80">
        <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <th className="w-[44px] px-3 py-3 text-center font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all leads"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-brand-500 focus:ring-brand-500"
                />
              </th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">Received</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">Type</th>
              <th className="min-w-[160px] px-3 py-3 font-medium">Reason</th>
              <th className="min-w-[120px] px-3 py-3 font-medium">Name</th>
              <th className="min-w-[180px] px-3 py-3 font-medium">Email</th>
              <th className="min-w-[100px] px-3 py-3 font-medium">Company</th>
              <th className="min-w-[120px] px-3 py-3 font-medium">Phone</th>
              <th className="min-w-[220px] px-3 py-3 font-medium">Message</th>
              <th className="w-[88px] px-3 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-zinc-200">
            {rows.map((row) => {
              const { payload } = row
              const email = payloadStr(payload, "email")
              const msg = payloadStr(payload, "message")
              const msgShort = msg.length > 120 ? `${msg.slice(0, 117)}…` : msg
              const isDeleting = deletingId === row.id
              const isSelected = selectedIds.includes(row.id)
              return (
                <tr key={row.id} className="border-b border-zinc-800/90 align-top hover:bg-zinc-900/60">
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select lead ${row.id}`}
                      checked={isSelected}
                      onChange={() => toggleRowSelection(row.id)}
                      disabled={bulkDeleting || Boolean(deletingId)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-brand-500 focus:ring-brand-500 disabled:opacity-60"
                    />
                  </td>
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
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDelete(row.id)}
                      disabled={isDeleting || bulkDeleting}
                      className="inline-flex items-center gap-1 rounded-md border border-red-700/70 bg-red-950/30 px-2.5 py-1.5 text-xs text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Delete lead message"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
