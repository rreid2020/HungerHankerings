import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      console.error("Lead submission: DATABASE_URL is not set (expected ops DB e.g. hungerhankeringsadmin).")
      return NextResponse.json(
        { ok: false, error: "Contact form is temporarily unavailable." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { type, ...payload } = body

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

    const saved = await insertLead(type, { ...normalizedPayload })
    if (!saved) {
      console.error("Lead submission: insertLead returned null despite DATABASE_URL being set.")
      return NextResponse.json(
        { ok: false, error: "Could not save your message. Please try again or email hello@hungerhankerings.com." },
        { status: 503 }
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
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again later." }, { status: 500 })
  }
}
