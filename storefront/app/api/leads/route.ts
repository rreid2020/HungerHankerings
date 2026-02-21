import { NextResponse } from "next/server"
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

    const normalizedPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([, v]) => v != null && v !== ""
      )
    ) as Record<string, unknown>

    const lead = await insertLead(type, { ...normalizedPayload })
    if (lead) {
      await sendLeadNotification(type, normalizedPayload)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Lead submission error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
