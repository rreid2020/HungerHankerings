/** Shared contact-form spam heuristics (no outbound I/O). */

export const MAX_SUBMISSIONS_PER_IP = 12
export const MAX_SUBMISSIONS_PER_EMAIL = 8
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const SPAM_PHRASE_RE =
  /\b(viagra|cialis|crypto\s*invest|forex|seo\s*service|backlinks?|guest\s*post|onlyfans|casino|porn|xxx|make\s*money\s*fast|nigerian\s*prince)\b/i

export function getClientIp(request: Request): string {
  const h = request.headers
  const fromCf = h.get("cf-connecting-ip")?.trim()
  if (fromCf) return fromCf
  const fromReal = h.get("x-real-ip")?.trim()
  if (fromReal) return fromReal
  const fromForwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (fromForwarded) return fromForwarded
  return "unknown"
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function hasTooManyUrls(input: string): boolean {
  const hits = input.match(/https?:\/\/|www\./gi)
  return (hits?.length ?? 0) > 5
}

export function isLikelySpamName(input: string): boolean {
  const cleaned = input.trim()
  if (cleaned.length < 2 || cleaned.length > 120) return true
  // Allow common name punctuation / accents via Unicode letters
  if (!/^[\p{L}\p{N} .,'’\-]+$/u.test(cleaned)) return true
  return false
}

export function isValidEmailShape(email: string): boolean {
  if (email.length < 5 || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isHoneypotTripped(fields: Record<string, unknown>): boolean {
  for (const key of ["website", "company_url", "fax"]) {
    const v = fields[key]
    if (typeof v === "string" && v.trim()) return true
  }
  return false
}

export type SpamContentVerdict =
  | { spam: true; reason: string; userMessage?: string }
  | { spam: false }

/** Soft content checks — only reject clear junk, with user-visible messages when appropriate. */
export function scoreLeadContent(input: {
  name: string
  email: string
  message: string
  company?: string
  phone?: string
}): SpamContentVerdict {
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  const message = (input.message ?? "").trim()
  const company = (input.company ?? "").trim()
  const blob = `${name}\n${email}\n${company}\n${message}`

  if (message.length > 8000) {
    return {
      spam: true,
      reason: "message_too_long",
      userMessage: "Message is too long. Please shorten it and try again.",
    }
  }
  if (hasTooManyUrls(blob)) {
    return { spam: true, reason: "too_many_urls" }
  }
  if (SPAM_PHRASE_RE.test(blob)) {
    return { spam: true, reason: "spam_phrase" }
  }
  if (isLikelySpamName(name)) {
    return {
      spam: true,
      reason: "bad_name",
      userMessage: "Please enter a valid name.",
    }
  }
  if (!isValidEmailShape(email)) {
    return {
      spam: true,
      reason: "bad_email",
      userMessage: "Please enter a valid email.",
    }
  }
  return { spam: false }
}

export function createRateLimiter() {
  const hits = new Map<string, number[]>()

  function allow(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((ts) => now - ts < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5_000) {
      for (const [k, times] of hits) {
        const kept = times.filter((ts) => now - ts < windowMs)
        if (kept.length === 0) hits.delete(k)
        else hits.set(k, kept)
      }
    }
    return true
  }

  return {
    allowIp(ip: string) {
      return allow(`ip:${ip}`, MAX_SUBMISSIONS_PER_IP, RATE_LIMIT_WINDOW_MS)
    },
    allowEmail(email: string) {
      return allow(`email:${normalizeEmail(email)}`, MAX_SUBMISSIONS_PER_EMAIL, RATE_LIMIT_WINDOW_MS)
    },
  }
}
