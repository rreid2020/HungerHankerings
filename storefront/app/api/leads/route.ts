import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead, isLeadsDatabaseConfigured } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
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
    const { type, ...payload } = body as Record<string, unknown>

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
