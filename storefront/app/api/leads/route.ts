import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead, isLeadsDatabaseConfigured } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    if (!isLeadsDatabaseConfigured()) {
      console.error(
        "Lead submission: no database URL (set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD + LEADS_DATABASE_NAME or DB_NAME).",
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

    const emailed = await sendLeadNotification(type, normalizedPayload)
    if (!emailed.success) {
      console.error("Lead submission: email failed after DB save:", emailed.error, "lead_id=", saved.id)
      return NextResponse.json(
        {
          ok: false,
          error:
            "Your message was saved but we could not send the notification email. Please email hello@hungerhankerings.com directly so we can follow up."
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Lead submission error:", err)
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again later." },
      { status: 500 },
    )
  }
}
