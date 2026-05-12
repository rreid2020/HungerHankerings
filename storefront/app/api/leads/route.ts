import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead, isLeadsDatabaseConfigured } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"

export const runtime = "nodejs"

const MAX_SUBMISSIONS_PER_WINDOW = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const MIN_SUBMIT_DURATION_MS = 2000
const rateLimitHits = new Map<string, number[]>()

function getClientIp(request: Request): string {
  const h = request.headers
  const fromCf = h.get("cf-connecting-ip")?.trim()
  if (fromCf) return fromCf
  const fromForwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (fromForwarded) return fromForwarded
  return "unknown"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const recent = (rateLimitHits.get(ip) ?? []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    rateLimitHits.set(ip, recent)
    return false
  }
  recent.push(now)
  rateLimitHits.set(ip, recent)
  return true
}

function hasTooManyUrls(input: string): boolean {
  const hits = input.match(/https?:\/\/|www\./gi)
  return (hits?.length ?? 0) > 2
}

function isLikelySpamName(input: string): boolean {
  const cleaned = input.trim()
  if (cleaned.length < 2 || cleaned.length > 80) return true
  if (!/^[\p{L}\p{N} .,'-]+$/u.test(cleaned)) return true
  return /[!@#$%^&*_=+<>]{2,}/.test(cleaned)
}

async function verifyTurnstileIfConfigured(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true
  if (typeof token !== "string" || !token.trim()) return false
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
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(ip)) {
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
    const { type, formStartedAt, turnstileToken, website, ...payload } = body as Record<string, unknown>

    if (typeof website === "string" && website.trim()) {
      // Honeypot hit; pretend success to avoid bot retries.
      return NextResponse.json({ ok: true })
    }
    if (typeof formStartedAt === "number") {
      const elapsed = Date.now() - formStartedAt
      if (elapsed < MIN_SUBMIT_DURATION_MS) {
        return NextResponse.json({ ok: false, error: "Submission rejected. Please try again." }, { status: 400 })
      }
    }
    const turnstileOk = await verifyTurnstileIfConfigured(turnstileToken, ip)
    if (!turnstileOk) {
      return NextResponse.json(
        { ok: false, error: "Security verification failed. Please try again." },
        { status: 400 },
      )
    }

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid type" },
        { status: 400 }
      )
    }

    if (type !== "inquiry") {
      return NextResponse.json(
        { ok: false, error: "Unsupported submission type" },
        { status: 400 }
      )
    }

    const normalizedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([, v]) => v != null && v !== ""
      )
    ) as Record<string, unknown>

    const reason = normalizedPayload.reason
    if (typeof reason !== "string" || !isInquiryReason(reason)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid reason for contact" },
        { status: 400 }
      )
    }

    const name = normalizedPayload.name
    const email = normalizedPayload.email
    const message = normalizedPayload.message
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Name is required" },
        { status: 400 }
      )
    }
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      )
    }
    if (isLikelySpamName(name)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid name." },
        { status: 400 },
      )
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email." },
        { status: 400 },
      )
    }
    if (typeof message === "string") {
      const m = message.trim()
      if (m.length > 4000 || hasTooManyUrls(m)) {
        return NextResponse.json(
          { ok: false, error: "Message looks invalid. Please edit and try again." },
          { status: 400 },
        )
      }
    }

    let saved
    try {
      saved = await insertLead(type, { ...normalizedPayload })
    } catch (dbErr) {
      console.error("Lead submission: database error:", dbErr)
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not save your message. Please try again or email hello@hungerhankerings.com.",
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

    // Do not await Resend (avoids 504). Avoid `after()` here — on self-hosted Docker, scheduling via the
    // microtask queue is more reliable than Next’s post-response hook for outbound HTTP.
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
