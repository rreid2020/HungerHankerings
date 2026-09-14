/** Shared contact-form spam heuristics (no outbound I/O). */

export const MAX_SUBMISSIONS_PER_IP = 3
export const MAX_SUBMISSIONS_PER_EMAIL = 2
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const MIN_SUBMIT_DURATION_MS = 3_000
export const MAX_SUBMIT_AGE_MS = 2 * 60 * 60 * 1000

const SPAM_PHRASE_RE =
  /\b(viagra|cialis|crypto\s*invest|forex|seo\s*service|backlinks?|guest\s*post|onlyfans|casino|porn|xxx|click\s*here|make\s*money\s*fast|weight\s*loss|nigerian\s*prince)\b/i

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
  return (hits?.length ?? 0) > 1
}

export function isLikelySpamName(input: string): boolean {
  const cleaned = input.trim()
  if (cleaned.length < 2 || cleaned.length > 80) return true
  if (!/^[\p{L}\p{N} .,'-]+$/u.test(cleaned)) return true
  if (/[!@#$%^&*_=+<>]{2,}/.test(cleaned)) return true
  // Long run of consonants / random keyboard spam
  if (/[bcdfghjklmnpqrstvwxyz]{8,}/i.test(cleaned.replace(/\s+/g, ""))) return true
  return false
}

export function isValidEmailShape(email: string): boolean {
  if (email.length < 5 || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isDisposableLikeEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? ""
  return /^(mailinator\.|guerrillamail|tempmail|throwaway|yopmail|10minutemail|trashmail|sharklasers|getnada|temp-mail)/i.test(
    domain,
  )
}

/**
 * Timing token from the browser form. Missing/too-fast/stale → spam.
 */
export function isTimingTokenValid(formStartedAt: unknown, now = Date.now()): boolean {
  if (typeof formStartedAt !== "number" || !Number.isFinite(formStartedAt)) return false
  const elapsed = now - formStartedAt
  if (elapsed < MIN_SUBMIT_DURATION_MS) return false
  if (elapsed > MAX_SUBMIT_AGE_MS) return false
  return true
}

export function isHoneypotTripped(fields: Record<string, unknown>): boolean {
  for (const key of ["website", "company_url", "fax"]) {
    const v = fields[key]
    if (typeof v === "string" && v.trim()) return true
  }
  return false
}

export type SpamContentVerdict = { spam: true; reason: string } | { spam: false }

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

  if (message.length < 8) {
    return { spam: true, reason: "message_too_short" }
  }
  if (message.length > 4000) {
    return { spam: true, reason: "message_too_long" }
  }
  if (hasTooManyUrls(blob)) {
    return { spam: true, reason: "too_many_urls" }
  }
  if (SPAM_PHRASE_RE.test(blob)) {
    return { spam: true, reason: "spam_phrase" }
  }
  if (isLikelySpamName(name)) {
    return { spam: true, reason: "bad_name" }
  }
  if (!isValidEmailShape(email) || isDisposableLikeEmail(email)) {
    return { spam: true, reason: "bad_email" }
  }
  // Message is mostly links / no letters
  const letters = (message.match(/\p{L}/gu) ?? []).length
  if (letters < 6) {
    return { spam: true, reason: "low_letter_density" }
  }
  return { spam: false }
}

/** Soft Origin/Referer check — allow missing headers (some privacy browsers). */
export function isAllowedRequestOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get("origin")?.trim()
  if (origin) {
    return allowedOrigins.some((o) => origin === o || origin.startsWith(`${o}/`))
  }
  const referer = request.headers.get("referer")?.trim()
  if (referer) {
    try {
      const u = new URL(referer)
      const base = `${u.protocol}//${u.host}`
      return allowedOrigins.some((o) => base === o)
    } catch {
      return false
    }
  }
  // No Origin/Referer: still allow (mobile/privacy), rely on other checks
  return true
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
    // Opportunistic cleanup
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
