"use client"

import { useState } from "react"

type Props = {
  orderCode: string
  customerEmail: string
  enabled: boolean
}

export default function OpsResendConfirmationButton({
  orderCode,
  customerEmail,
  enabled,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleResend() {
    if (!enabled || loading) return
    const ok = window.confirm(
      `Resend order confirmation for ${orderCode} to ${customerEmail}?`,
    )
    if (!ok) return

    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/ops/orders/${encodeURIComponent(orderCode)}/resend-confirmation`,
        { method: "POST" },
      )
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        error?: string
        recipientEmail?: string
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || `Resend failed (${res.status})`)
      }
          setMessage(data.message || `Sent to ${data.recipientEmail || customerEmail}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend confirmation")
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Sending…" : "Resend email"}
      </button>
      {message ? <p className="text-[11px] text-emerald-700">{message}</p> : null}
      {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
    </div>
  )
}
