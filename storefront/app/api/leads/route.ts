import { NextResponse } from "next/server"
import { isInquiryReason } from "../../../lib/contact-inquiry"
import { insertLead } from "../../../lib/db"
import { sendLeadNotification } from "../../../lib/email"

export async function POST(request: Request) {
  try {
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

    await insertLead(type, { ...normalizedPayload })
    await sendLeadNotification(type, normalizedPayload)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Lead submission error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
