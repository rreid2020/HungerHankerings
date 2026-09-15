import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead, isLeadsDatabaseConfigured } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"
import {
  createRateLimiter,
  getClientIp,
  isHoneypotTripped,
  normalizeEmail,
  scoreLeadContent,
} from "../../../lib/lead-spam-guard"

export const runtime = "nodejs"

const rateLimiter = createRateLimiter()

/** Pretend success so bots do not adapt (honeypot / clear spam only). */
function silentOk() {
  return NextResponse.json({ ok: true })
}

/**
 * Verify Turnstile when a token is present.
 * If the secret is configured but the browser sent no token (widget not loaded / build-time
 * site key missing), allow the submit — honeypot + rate limits still apply.
 */
async function verifyTurnstileBestEffort(token: unknown, ip: string): Promise<"skip" | "ok" | "fail"> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return "skip"
  if (typeof token !== "string" || !token.trim()) {
    console.warn("Lead submission: Turnstile secret set but no token; allowing submit ip=", ip)
    return "skip"
  }
  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
      remoteip: ip,
    })
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    })
    if (!res.ok) return "fail"
    const data = (await res.json()) as { success?: boolean }
    return data.success === true ? "ok" : "fail"
  } catch {
    return "fail"
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)

    if (!rateLimiter.allowIp(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many submissions. Please try again in a few minutes." },
        { status: 429 },
      )
    }

    if (!isLeadsDatabaseConfigured()) {
      console.error(
        "Lead submission: leads DB not configured (set LEADS_DATABASE_URL, or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD + LEADS_DATABASE_NAME, or DATABASE_URL).",
      )
      return NextResponse.json(
        { ok: false, error: "Contact form is temporarily unavailable." },
        { status: 503 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
    }
    const raw = body as Record<string, unknown>
    const { type, formStartedAt: _formStartedAt, turnstileToken, ...payload } = raw

    if (isHoneypotTripped(raw)) {
      console.info("Lead submission: honeypot tripped ip=", ip)
      return silentOk()
    }

    const turnstile = await verifyTurnstileBestEffort(turnstileToken, ip)
    if (turnstile === "fail") {
      return NextResponse.json(
        { ok: false, error: "Security check expired. Please refresh the page and try again." },
        { status: 400 },
      )
    }

    if (!type || typeof type !== "string") {
      return NextResponse.json({ ok: false, error: "Missing or invalid type" }, { status: 400 })
    }

    if (type !== "inquiry") {
      return NextResponse.json({ ok: false, error: "Unsupported submission type" }, { status: 400 })
    }

    const normalizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v != null && v !== ""),
    ) as Record<string, unknown>

    delete normalizedPayload.website
    delete normalizedPayload.company_url
    delete normalizedPayload.fax

    const reason = normalizedPayload.reason
    if (typeof reason !== "string" || !isInquiryReason(reason)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid reason for contact" },
        { status: 400 },
      )
    }

    const name = normalizedPayload.name
    const email = normalizedPayload.email
    const message = normalizedPayload.message
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 })
    }
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 })
    }
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 })
    }

    const emailNorm = normalizeEmail(email)
    if (!rateLimiter.allowEmail(emailNorm)) {
      return NextResponse.json(
        { ok: false, error: "Too many submissions from this email. Please try again later." },
        { status: 429 },
      )
    }

    const verdict = scoreLeadContent({
      name,
      email: emailNorm,
      message,
      company: typeof normalizedPayload.company === "string" ? normalizedPayload.company : undefined,
      phone: typeof normalizedPayload.phone === "string" ? normalizedPayload.phone : undefined,
    })
    if (verdict.spam) {
      console.info("Lead submission: content rejected reason=", verdict.reason, "ip=", ip)
      if (verdict.userMessage) {
        return NextResponse.json({ ok: false, error: verdict.userMessage }, { status: 400 })
      }
      return silentOk()
    }

    normalizedPayload.email = emailNorm
    normalizedPayload.name = name.trim()
    normalizedPayload.message = message.trim()

    let saved
    try {
      saved = await insertLead(type, { ...normalizedPayload })
    } catch (dbErr) {
      console.error("Lead submission: database error:", dbErr)
      return NextResponse.json(
        {
          ok: false,
          error: "Could not save your message. Please try again or email hello@hungerhankerings.com.",
        },
        { status: 503 },
      )
    }
    if (!saved) {
      console.error("Lead submission: insertLead returned null despite DB being configured.")
      return NextResponse.json(
        {
          ok: false,
          error: "Could not save your message. Please try again or email hello@hungerhankerings.com.",
        },
        { status: 503 },
      )
    }

    const leadId = saved.id
    const payloadForMail = { ...normalizedPayload }
    void Promise.resolve()
      .then(() => sendLeadNotification(type, payloadForMail))
      .then((emailed) => {
        if (!emailed.success) {
          console.error(
            "Lead submission: notification email failed:",
            emailed.error,
            "lead_id=",
            leadId,
          )
          return
        }
        console.info(
          "Lead submission: notification email sent lead_id=",
          leadId,
          "resend_id=",
          emailed.messageId ?? "?",
        )
      })
      .catch((mailErr) => {
        console.error("Lead submission: notification email threw:", mailErr, "lead_id=", leadId)
      })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Lead submission error:", err)
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again later." },
      { status: 500 },
    )
  }
}
