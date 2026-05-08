"use client"

import { FormEvent, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Button from "./Button"
import {
  INQUIRY_REASON_OPTIONS,
  type InquiryReason,
  isInquiryReason,
  normalizeInquiryReason
} from "../lib/contact-inquiry"

type ContactQuoteFormProps = {
  /** Server-rendered default when `?reason=` is missing or invalid */
  initialReason?: InquiryReason
}

const ContactQuoteForm = ({ initialReason = "general" }: ContactQuoteFormProps) => {
  const searchParams = useSearchParams()
  const [reason, setReason] = useState<InquiryReason>(initialReason)
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    const fromUrl = normalizeInquiryReason(searchParams.get("reason"))
    setReason(fromUrl)
  }, [searchParams])

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
        message
      })
    })

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
      return
    }

    form.reset()
    setReason(resolvedReason)
    setStatus("sent")
  }

  const inputClass =
    "mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <textarea name="message" rows={5} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary">
          Send message
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
