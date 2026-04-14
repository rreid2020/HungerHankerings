export const INQUIRY_REASON_OPTIONS = [
  { value: "general", label: "General inquiry" },
  { value: "other", label: "Other" },
  { value: "team-snack-boxes", label: "Corporate team snack boxes" },
  { value: "team-snack-delivery", label: "Team snacks delivered (Canada-wide)" },
  { value: "office-snack-pantry", label: "Office snack pantry service" },
  { value: "office-pantry-plan", label: "Office pantry — request a plan" },
  { value: "bulk-pallet", label: "Bulk / pallet orders" },
  { value: "corporate-programs", label: "Corporate programs" },
  { value: "fundraising", label: "Fundraising" },
  { value: "gift-a-box", label: "Gift a box" },
  { value: "shop", label: "Shop / themed snack boxes" }
] as const

export type InquiryReason = (typeof INQUIRY_REASON_OPTIONS)[number]["value"]

const REASON_SET = new Set<string>(INQUIRY_REASON_OPTIONS.map((o) => o.value))

export function isInquiryReason(value: string): value is InquiryReason {
  return REASON_SET.has(value)
}

export function getInquiryReasonLabel(reason: InquiryReason): string {
  return INQUIRY_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason
}

export function normalizeInquiryReason(
  value: string | string[] | undefined | null
): InquiryReason {
  const v = Array.isArray(value) ? value[0] : value
  if (v && isInquiryReason(v)) return v
  return "general"
}

export function contactQuoteHref(reason: InquiryReason): string {
  return `/contact?reason=${encodeURIComponent(reason)}`
}
