"use client"

import { FormEvent, useEffect, useState } from "react"
import Script from "next/script"
import { useSearchParams } from "next/navigation"
import Button from "./Button"
import {
  INQUIRY_REASON_OPTIONS,
  type InquiryReason,
  isInquiryReason,
  normalizeInquiryReason
} from "../lib/contact-inquiry"
import { captureEvent } from "../lib/analytics"

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: string | HTMLElement,
        opts: {
          sitekey: string
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
        },
      ) => unknown
      remove?: (widgetId: unknown) => void
      reset?: (widgetId: unknown) => void
    }
  }
}

type ContactQuoteFormProps = {
  /** Server-rendered default when `?reason=` is missing or invalid */
  initialReason?: InquiryReason
}

const ContactQuoteForm = ({ initialReason = "general" }: ContactQuoteFormProps) => {
  const searchParams = useSearchParams()
  const [reason, setReason] = useState<InquiryReason>(initialReason)
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<unknown>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [formStartedAt] = useState<number>(() => Date.now())
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""

  useEffect(() => {
    const fromUrl = normalizeInquiryReason(searchParams.get("reason"))
    setReason(fromUrl)
  }, [searchParams])

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileReady || !window.turnstile) return
    const el = document.getElementById("contact-turnstile")
    if (!el || el.childElementCount > 0) return
    const widgetId = window.turnstile.render(el, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    })
    setTurnstileWidgetId(widgetId)
    return () => {
      if (window.turnstile?.remove && widgetId != null) {
        window.turnstile.remove(widgetId)
      }
    }
  }, [turnstileSiteKey, turnstileReady])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setErrorDetail(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const company = String(formData.get("company") ?? "").trim()
    const phone = String(formData.get("phone") ?? "").trim()
    const message = String(formData.get("message") ?? "").trim()
    const submittedReason = formData.get("reason")
    const resolvedReason =
      typeof submittedReason === "string" && isInquiryReason(submittedReason)
        ? submittedReason
        : reason

    if (!message.trim()) {
      setErrorDetail("Please include a message.")
      setStatus("error")
      return
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "inquiry",
        reason: resolvedReason,
        name,
        email,
        company,
        phone,
        message,
        website: String(formData.get("website") ?? ""),
        company_url: String(formData.get("company_url") ?? ""),
        fax: String(formData.get("fax") ?? ""),
        formStartedAt,
        turnstileToken,
      })
    })

    if (!response.ok) {
      let detail: string | null = null
      try {
        const data = (await response.json()) as { error?: string }
        if (typeof data.error === "string" && data.error.trim()) detail = data.error.trim()
      } catch {
        /* ignore */
      }
      setErrorDetail(detail)
      setStatus("error")
      return
    }

    form.reset()
    setReason(resolvedReason)
    setTurnstileToken("")
    if (turnstileWidgetId != null && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetId)
    }
    setStatus("sent")
    captureEvent("lead_submit", {
      reason: resolvedReason,
      has_company: Boolean(company),
    })
  }

  const inputClass =
    "mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

  return (
    <>
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <label className="text-sm font-medium text-iron_grey">
          Reason for contact
          <select
            name="reason"
            required
            value={reason}
            onChange={(e) =>
              setReason(isInquiryReason(e.target.value) ? e.target.value : "general")
            }
            className={inputClass}
          >
            {INQUIRY_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-iron_grey">
          Name
          <input name="name" required className={inputClass} autoComplete="name" />
        </label>
        <label className="text-sm font-medium text-iron_grey">
          Email
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="text-sm font-medium text-iron_grey">
          Company
          <input name="company" className={inputClass} autoComplete="organization" />
        </label>
        <label className="text-sm font-medium text-iron_grey">
          Phone <span className="font-normal text-iron_grey/70">(optional)</span>
          <input name="phone" type="tel" className={inputClass} autoComplete="tel" />
        </label>
        <label className="text-sm font-medium text-iron_grey">
          Message
          <textarea name="message" rows={5} required className={inputClass} />
        </label>
        {/* Honeypots: off-screen; real users never fill these */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            top: "auto",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" name="website" defaultValue="" />
          </label>
          <label>
            Company website
            <input tabIndex={-1} autoComplete="off" name="company_url" defaultValue="" />
          </label>
          <label>
            Fax
            <input tabIndex={-1} autoComplete="off" name="fax" defaultValue="" />
          </label>
        </div>
        {turnstileSiteKey ? (
          <div className="min-h-[65px]">
            <div id="contact-turnstile" />
            <p className="mt-1 text-xs text-iron_grey/70">
              Security check loads here when available — you can still send if it does not appear.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Send message"}
          </Button>
          {status === "sent" && (
            <span className="text-sm text-cherry_blossom">Thanks — we will be in touch soon.</span>
          )}
          {status === "error" && (
            <span className="text-sm text-light_coral-600">
              {errorDetail ??
                "Something went wrong. Please try again or email hello@hungerhankerings.com."}
            </span>
          )}
        </div>
      </form>
    </>
  )
}

export default ContactQuoteForm
