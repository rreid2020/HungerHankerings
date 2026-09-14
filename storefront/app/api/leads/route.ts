import { NextResponse } from "next/server"
import {
  INQUIRY_LEAD_TYPE,
  SPAM_LEAD_TYPE,
  isInquiryReason,
} from "../../../lib/contact-inquiry"
import { insertLead, isLeadsDatabaseConfigured } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"
import {
  checkContentThrottle,
  checkRequestThrottle,
  checkSubmitTiming,
  getClientIp,
  isTrustedFormOrigin,
  isValidEmailShape,
  looksLikeSpamName,
  recordAcceptedSubmission,
  scoreInquiryContent,
  submissionFingerprint,
  type OriginTrust,
} from "../../../lib/spam-guard"

export const runtime = "nodejs"

/** Our form posts ~1 KB; anything larger is a bot padding the body. */
const MAX_BODY_BYTES = 20_000
const MAX_COMPANY_LENGTH = 120
const MAX_PHONE_LENGTH = 40
const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 4000

/** Bots see the same response as a happy submission so they do not tune their payload and retry. */
function silentOk(): NextResponse {
  return NextResponse.json({ ok: true })
}

function rateLimited(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Too many submissions. Please try again in a few minutes." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}

async function verifyTurnstileIfConfigured(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true
  if (typeof token !== "string" || !token.trim()) return false
  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
      ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
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

function logRejection(reason: string, ip: string, extra?: Record<string, unknown>): void {
  console.warn(
    "[leads] rejected submission:",
    reason,
    "ip=",
    ip,
    extra ? JSON.stringify(extra) : "",
  )
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)

    const throttle = checkRequestThrottle(ip)
    if (!throttle.ok && throttle.kind === "rate_limited") {
      logRejection(`rate_limited:${throttle.scope}`, ip)
      return rateLimited(throttle.retryAfterSeconds)
    }

    const originTrust: OriginTrust = isTrustedFormOrigin(request)
    if (originTrust === "mismatch") {
      logRejection("origin_mismatch", ip, { origin: request.headers.get("origin") })
      return NextResponse.json({ ok: false, error: "Submission rejected." }, { status: 403 })
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0")
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      logRejection("body_too_large", ip, { declaredLength })
      return NextResponse.json({ ok: false, error: "Submission too large." }, { status: 413 })
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

    const rawBody = await request.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      logRejection("body_too_large", ip, { bytes: rawBody.length })
      return NextResponse.json({ ok: false, error: "Submission too large." }, { status: 413 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 })
    }

    const fields = body as Record<string, unknown>

    // Honeypot: hidden in the form, so any value at all means a bot filled every input it found.
    if (typeof fields.website === "string" && fields.website.trim()) {
      logRejection("honeypot", ip)
      return silentOk()
    }

    const timing = checkSubmitTiming(fields.formStartedAt)
    if (timing !== "ok") {
      logRejection(`timing_${timing}`, ip)
      if (timing === "missing") {
        // Our form always sends this, so the caller is not the form.
        return silentOk()
      }
      return NextResponse.json(
        { ok: false, error: "Submission rejected. Please reload the page and try again." },
        { status: 400 },
      )
    }

    if (!(await verifyTurnstileIfConfigured(fields.turnstileToken, ip))) {
      logRejection("turnstile_failed", ip)
      return NextResponse.json(
        { ok: false, error: "Security verification failed. Please try again." },
        { status: 400 },
      )
    }

    if (fields.type !== INQUIRY_LEAD_TYPE) {
      logRejection("unsupported_type", ip, { type: fields.type })
      return NextResponse.json(
        { ok: false, error: "Unsupported submission type" },
        { status: 400 },
      )
    }

    const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "")
    const reason = str(fields.reason)
    const name = str(fields.name)
    const email = str(fields.email)
    const company = str(fields.company)
    const phone = str(fields.phone)
    const message = str(fields.message)

    if (!isInquiryReason(reason)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid reason for contact" },
        { status: 400 },
      )
    }
    if (!name || looksLikeSpamName(name)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid name." }, { status: 400 })
    }
    if (!email || !isValidEmailShape(email)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 })
    }
    if (company.length > MAX_COMPANY_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "Company name is too long." },
        { status: 400 },
      )
    }
    if (phone.length > MAX_PHONE_LENGTH) {
      return NextResponse.json({ ok: false, error: "Please enter a valid phone number." }, { status: 400 })
    }
    if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Please tell us a bit more (${MIN_MESSAGE_LENGTH}–${MAX_MESSAGE_LENGTH} characters).`,
        },
        { status: 400 },
      )
    }

    const content = { name, email, company, phone, message }
    const fingerprint = submissionFingerprint(content)

    const contentThrottle = checkContentThrottle({ email, fingerprint })
    if (!contentThrottle.ok) {
      if (contentThrottle.kind === "duplicate") {
        logRejection("duplicate_submission", ip, { email })
        return silentOk()
      }
      logRejection(`rate_limited:${contentThrottle.scope}`, ip, { email })
      return rateLimited(contentThrottle.retryAfterSeconds)
    }

    const verdict = scoreInquiryContent(content, { originTrust })
    if (verdict.action === "drop") {
      logRejection("spam_dropped", ip, { score: verdict.score, reasons: verdict.reasons })
      return silentOk()
    }

    const isQuarantined = verdict.action === "quarantine"
    const payload: Record<string, unknown> = {
      reason,
      name,
      email,
      ...(company ? { company } : {}),
      ...(phone ? { phone } : {}),
      message,
      ...(isQuarantined
        ? { _spam: { score: verdict.score, reasons: verdict.reasons, originTrust } }
        : {}),
    }
    const leadType = isQuarantined ? SPAM_LEAD_TYPE : INQUIRY_LEAD_TYPE

    let saved
    try {
      saved = await insertLead(leadType, payload)
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

    recordAcceptedSubmission({ email, fingerprint })

    if (isQuarantined) {
      // Held for review in the ops inbox; never emailed, so a flood cannot bury real leads.
      console.warn(
        "[leads] quarantined as likely spam lead_id=",
        saved.id,
        "score=",
        verdict.score,
        "reasons=",
        verdict.reasons.join(","),
      )
      return silentOk()
    }

    // Do not await Resend (avoids 504). Avoid `after()` here — on self-hosted Docker, scheduling via the
    // microtask queue is more reliable than Next’s post-response hook for outbound HTTP.
    const leadId = saved.id
    const payloadForMail = { ...payload }
    void Promise.resolve()
      .then(() => sendLeadNotification(INQUIRY_LEAD_TYPE, payloadForMail))
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
