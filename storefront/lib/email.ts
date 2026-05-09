import { Resend } from "resend"
import { getInquiryReasonLabel, isInquiryReason } from "./contact-inquiry"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.LEAD_EMAIL_FROM ?? "Hunger Hankerings <onboarding@resend.dev>"
const DEFAULT_LEAD_TO = "hello@hungerhankerings.com"
const TO_EMAIL = (process.env.LEAD_EMAIL_TO ?? "").trim() || DEFAULT_LEAD_TO

/** Avoid hanging until nginx/Cloudflare returns 504 if Resend never responds. */
const SEND_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.LEAD_EMAIL_SEND_TIMEOUT_MS ?? "15000") || 15000, 3000),
  120_000,
)

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

function formatPayloadForEmail(payload: Record<string, unknown>): string {
  return Object.entries(payload)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n")
}

export async function sendLeadNotification(
  type: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured" }
  }

  const reasonRaw = payload.reason
  const reasonLabel =
    typeof reasonRaw === "string" && isInquiryReason(reasonRaw)
      ? getInquiryReasonLabel(reasonRaw)
      : String(reasonRaw ?? "")
  const subject =
    type === "inquiry" && reasonLabel
      ? `New inquiry: ${reasonLabel}`
      : `New lead: ${type}`

  const body = formatPayloadForEmail(payload)

  try {
    const { error } = await withTimeout(
      resend.emails.send({
        from: FROM_EMAIL,
        to: TO_EMAIL.split(",").map((e) => e.trim()).filter(Boolean),
        subject,
        text: body,
      }),
      SEND_TIMEOUT_MS,
      "Resend email send",
    )

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: message }
  }
}
