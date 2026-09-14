"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Script from "next/script"
import Button from "./Button"
import {
  INQUIRY_REASON_OPTIONS,
  type InquiryReason,
  isInquiryReason,
  normalizeInquiryReason
} from "../lib/contact-inquiry"
import { captureEvent } from "../lib/analytics"

type TurnstileRenderOptions = {
  sitekey: string
  callback?: (token: string) => void
  "expired-callback"?: () => void
  "error-callback"?: () => void
  "timeout-callback"?: () => void
  action?: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, opts: TurnstileRenderOptions) => unknown
      remove?: (widgetId: unknown) => void
      reset?: (widgetId: unknown) => void
    }
  }
}

type ContactQuoteFormProps = {
  /** Server-rendered default when `?reason=` is missing or invalid */
  initialReason?: InquiryReason
}

const MIN_MESSAGE_LENGTH = 10

const ContactQuoteForm = ({ initialReason = "general" }: ContactQuoteFormProps) => {
  const searchParams = useSearchParams()
  const [reason, setReason] = useState<InquiryReason>(initialReason)
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState("")
  const [turnstileReady, setTurnstileReady] = useState(false)
  const turnstileWidgetId = useRef<unknown>(null)
  const [formStartedAt] = useState<number>(() => Date.now())
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""

  useEffect(() => {
    const fromUrl = normalizeInquiryReason(searchParams.get("reason"))
    setReason(fromUrl)
  }, [searchParams])

  /**
   * Explicit render: the widget only exists once Cloudflare's `api.js` has loaded, so mounting it
   * from a `Script` callback (not on first paint) is what makes the token available at submit time.
   */
  const renderTurnstile = useCallback(() => {
    if (!turnstileSiteKey || !window.turnstile || turnstileWidgetId.current != null) return
    const el = document.getElementById("contact-turnstile")
    if (!el) return
    turnstileWidgetId.current = window.turnstile.render(el, {
      sitekey: turnstileSiteKey,
      action: "contact-form",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
      "timeout-callback": () => setTurnstileToken(""),
    })
    setTurnstileReady(true)
  }, [turnstileSiteKey])

  useEffect(() => {
    return () => {
      if (window.turnstile?.remove && turnstileWidgetId.current != null) {
        window.turnstile.remove(turnstileWidgetId.current)
        turnstileWidgetId.current = null
      }
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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

    if (message.length < MIN_MESSAGE_LENGTH) {
      setErrorDetail(`Please tell us a bit more (at least ${MIN_MESSAGE_LENGTH} characters).`)
      setStatus("error")
      return
    }
    if (turnstileSiteKey && !turnstileToken) {
      setErrorDetail("Please complete the security check before sending.")
      setStatus("error")
      return
    }

    setStatus("loading")
    setErrorDetail(null)

    let response: Response
    try {
      response = await fetch("/api/leads", {
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
          formStartedAt,
          turnstileToken
        })
      })
    } catch {
      setErrorDetail("Network error. Please try again or email hello@hungerhankerings.com.")
      setStatus("error")
      return
    }

    if (!response.ok) {
      let message: string | null = null
      try {
        const data = (await response.json()) as { error?: string }
        if (typeof data.error === "string" && data.error.trim()) message = data.error.trim()
      } catch {
        /* ignore */
      }
      setErrorDetail(message)
      setStatus("error")
      // A stale/consumed token cannot be reused for the retry.
      setTurnstileToken("")
      if (turnstileWidgetId.current != null && window.turnstile?.reset) {
        window.turnstile.reset(turnstileWidgetId.current)
      }
      return
    }

    form.reset()
    setReason(resolvedReason)
    setTurnstileToken("")
    if (turnstileWidgetId.current != null && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetId.current)
    }
    setStatus("sent")
    captureEvent("lead_submit", {
      reason: resolvedReason,
      has_company: Boolean(company)
    })
  }

  const inputClass =
    "mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderTurnstile}
          onLoad={renderTurnstile}
        />
      ) : null}
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
        <input name="name" required maxLength={80} className={inputClass} autoComplete="name" />
      </label>
      <label className="text-sm font-medium text-iron_grey">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className={inputClass}
          autoComplete="email"
        />
      </label>
      <label className="text-sm font-medium text-iron_grey">
        Company
        <input name="company" maxLength={120} className={inputClass} autoComplete="organization" />
      </label>
      <label className="text-sm font-medium text-iron_grey">
        Phone <span className="font-normal text-iron_grey/70">(optional)</span>
        <input name="phone" type="tel" maxLength={40} className={inputClass} autoComplete="tel" />
      </label>
      <label className="text-sm font-medium text-iron_grey">
        Message
        <textarea
          name="message"
          rows={5}
          required
          minLength={MIN_MESSAGE_LENGTH}
          maxLength={4000}
          className={inputClass}
        />
      </label>
      {/* Honeypot for bots: real users never see/fill this field */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" name="website" />
        </label>
      </div>
      {turnstileSiteKey ? (
        <div>
          <div id="contact-turnstile" />
          {!turnstileReady ? (
            <p className="mt-2 text-xs text-iron_grey/70">Loading security check…</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="secondary"
          disabled={status === "loading"}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
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
  )
}

export default ContactQuoteForm
