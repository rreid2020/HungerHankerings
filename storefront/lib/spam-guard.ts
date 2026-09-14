/**
 * Anti-spam guard for the public contact form (`POST /api/leads`).
 *
 * Three independent layers, because bots that hit this endpoint usually skip the form entirely
 * and POST JSON straight at the API:
 *
 * 1. **Request shape** — origin/referer must match this site, the form must report a plausible
 *    `formStartedAt`, and the honeypot must be empty (`isTrustedFormOrigin`, route checks).
 * 2. **Throttling** — per-IP, per-email, and process-wide ceilings plus duplicate-body suppression
 *    (`checkSubmissionThrottle`, `recordAcceptedSubmission`).
 * 3. **Content scoring** — link/keyword/script heuristics that either quarantine (stored for review,
 *    no notification email) or drop the submission (`scoreInquiryContent`).
 *
 * State is in-process only: it survives normal traffic on a single container but resets on deploy.
 * Nginx (`nginx/nginx.conf`, `zone=api`) and Turnstile are the layers that survive restarts.
 */

export type SpamAction = "allow" | "quarantine" | "drop"

export type SpamVerdict = {
  action: SpamAction
  score: number
  reasons: string[]
}

export type InquiryContent = {
  name: string
  email: string
  company?: string
  phone?: string
  message?: string
}

/**
 * Stored for review (ops inbox) but never emailed. Set above the heaviest single soft signal so one
 * unlucky phrase ("we're a web design agency…") cannot hold a genuine lead on its own.
 */
const QUARANTINE_SCORE = 4
/** Discarded outright; the bot still sees `200` so it does not retry with a different payload. */
const DROP_SCORE = 6

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? "")
  const value = Number.isFinite(raw) && raw > 0 ? raw : fallback
  return Math.min(Math.max(Math.floor(value), min), max)
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Keep the maps from growing without bound under a distributed flood. */
const MAX_TRACKED_KEYS = 20_000

// --------------------------------------------------------------------------------------------
// Request shape
// --------------------------------------------------------------------------------------------

/**
 * Private, loopback, and link-local ranges. An address in one of these is a proxy hop (our own
 * nginx, the App Platform load balancer), never a visitor, so it must never key a rate limit:
 * every customer shares it.
 */
function isInternalAddress(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, "")
  if (!v) return true
  if (v === "::1" || v === "localhost" || v.startsWith("fc") || v.startsWith("fd")) return true
  if (v.startsWith("::ffff:")) return isInternalAddress(v.slice(7))
  const octets = v.split(".")
  if (octets.length !== 4) return false
  const [a, b] = octets.map((o) => Number(o))
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 169 && b === 254) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

/**
 * Client IP for throttling, or `"unknown"` when it cannot be established.
 *
 * `X-Forwarded-For` is client-appendable (nginx uses `$proxy_add_x_forwarded_for`), so the *first*
 * entry is attacker-controlled and the *last* is whichever proxy spoke to us. Each proxy appends the
 * peer it saw, so the right-most **public** address is the real visitor.
 *
 * `"unknown"` is deliberately safe rather than strict: it disables only the per-IP limits (the
 * site-wide ceiling, duplicate suppression, content scoring, and Turnstile still apply). Keying a
 * limit on a load-balancer address would instead throttle every customer at once — on App Platform
 * `X-Real-IP` is the balancer, not the visitor.
 *
 * Set `LEADS_TRUSTED_PROXY_HOPS` to drop N trailing entries first if a platform appends a *public*
 * proxy hop; the rate-limit logs print the resolved value so this is diagnosable.
 */
export function getClientIp(request: Request): string {
  const h = request.headers

  // Cloudflare overwrites CF-Connecting-IP, but only for traffic that truly passed through it.
  if (h.get("cf-ray")?.trim()) {
    const cfIp = h.get("cf-connecting-ip")?.split(",")[0]?.trim()
    if (cfIp && !isInternalAddress(cfIp)) return cfIp
  }

  const hops = envInt("LEADS_TRUSTED_PROXY_HOPS", 0, 0, 8)
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  const candidates = hops > 0 ? chain.slice(0, Math.max(chain.length - hops, 0)) : chain
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (!isInternalAddress(candidates[i])) return candidates[i]
  }

  const realIp = h.get("x-real-ip")?.split(",")[0]?.trim()
  if (realIp && !isInternalAddress(realIp)) return realIp

  return "unknown"
}

export type OriginTrust = "trusted" | "mismatch" | "unknown"

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

function hostFromHeader(value: string | null): string | null {
  const raw = value?.split(",")[0]?.trim()
  if (!raw) return null
  return hostFromUrl(raw.includes("://") ? raw : `http://${raw}`)
}

/**
 * Whether the POST came from a page on this site.
 *
 * `mismatch` (a real but foreign origin) is a hard failure. `unknown` (no origin, referer, or
 * `Sec-Fetch-Site`) only adds to the spam score: privacy tooling occasionally strips all three and
 * we would rather review such a lead than lose it.
 */
export function isTrustedFormOrigin(request: Request): OriginTrust {
  const h = request.headers
  const allowed = new Set<string>()
  for (const candidate of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    ...(process.env.LEADS_ALLOWED_ORIGIN_HOSTS ?? "").split(","),
  ]) {
    const host = candidate?.trim() ? hostFromHeader(candidate.trim()) : null
    if (host) allowed.add(host)
  }
  for (const header of ["x-forwarded-host", "host"]) {
    const host = hostFromHeader(h.get(header))
    if (host) allowed.add(host)
  }

  const origin = hostFromHeader(h.get("origin"))
  if (origin) return allowed.has(origin) ? "trusted" : "mismatch"

  const referer = hostFromHeader(h.get("referer"))
  if (referer) return allowed.has(referer) ? "trusted" : "mismatch"

  if (h.get("sec-fetch-site")?.trim().toLowerCase() === "same-origin") return "trusted"

  return "unknown"
}

/** Shortest human fill time; anything faster is scripted. */
export const MIN_SUBMIT_DURATION_MS = 2500
/** A form older than this was almost certainly replayed from a captured request. */
export const MAX_SUBMIT_AGE_MS = 12 * HOUR_MS

export type TimingCheck = "ok" | "missing" | "too_fast" | "stale"

/**
 * The form always sends `formStartedAt`, so a missing value means the caller is not our form.
 * Treated as a rejection rather than a score bump — it is the cheapest bot filter we have.
 */
export function checkSubmitTiming(formStartedAt: unknown): TimingCheck {
  if (typeof formStartedAt !== "number" || !Number.isFinite(formStartedAt)) return "missing"
  const elapsed = Date.now() - formStartedAt
  if (elapsed < MIN_SUBMIT_DURATION_MS) return "too_fast"
  if (elapsed > MAX_SUBMIT_AGE_MS) return "stale"
  return "ok"
}

// --------------------------------------------------------------------------------------------
// Throttling
// --------------------------------------------------------------------------------------------

type HitLog = Map<string, number[]>

const ipHits: HitLog = new Map()
const emailHits: HitLog = new Map()
const bodyFingerprints = new Map<string, number>()
let globalHits: number[] = []

function prune(log: HitLog, windowMs: number, now: number): void {
  for (const [key, stamps] of log) {
    const recent = stamps.filter((ts) => now - ts < windowMs)
    if (recent.length === 0) log.delete(key)
    else log.set(key, recent)
  }
  if (log.size > MAX_TRACKED_KEYS) {
    const overflow = log.size - MAX_TRACKED_KEYS
    let removed = 0
    for (const key of log.keys()) {
      log.delete(key)
      if (++removed >= overflow) break
    }
  }
}

function countWithin(log: HitLog, key: string, windowMs: number, now: number): number {
  return (log.get(key) ?? []).filter((ts) => now - ts < windowMs).length
}

function record(log: HitLog, key: string, now: number): void {
  const stamps = (log.get(key) ?? []).concat(now)
  log.set(key, stamps.slice(-64))
}

/** Cheap, stable hash for duplicate detection — not security-sensitive. */
function fingerprint(value: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0xc2b2ae35
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i)
    h1 = (h1 ^ c) * 0x01000193
    h2 = (h2 ^ (c + i)) * 0x85ebca6b
    h1 >>>= 0
    h2 >>>= 0
  }
  return `${h1.toString(36)}${h2.toString(36)}`
}

export function submissionFingerprint(content: InquiryContent): string {
  const normalized = [content.email, content.name, content.message ?? ""]
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
  return fingerprint(normalized)
}

export type ThrottleResult =
  | { ok: true }
  | {
      ok: false
      kind: "rate_limited"
      scope: "ip_burst" | "ip_daily" | "email_daily" | "site_burst"
      retryAfterSeconds: number
    }
  | { ok: false; kind: "duplicate" }

const IP_BURST_WINDOW_MS = 10 * MINUTE_MS
const DUPLICATE_WINDOW_MS = DAY_MS

function pruneAll(now: number): void {
  prune(ipHits, DAY_MS, now)
  prune(emailHits, DAY_MS, now)
  globalHits = globalHits.filter((ts) => now - ts < IP_BURST_WINDOW_MS)
  if (bodyFingerprints.size > MAX_TRACKED_KEYS) bodyFingerprints.clear()
  for (const [key, ts] of bodyFingerprints) {
    if (now - ts >= DUPLICATE_WINDOW_MS) bodyFingerprints.delete(key)
  }
}

/**
 * Per-IP and site-wide ceilings. Call once per request before any expensive work: the attempt is
 * counted even when later validation fails, so a bot cannot probe the endpoint for free.
 */
export function checkRequestThrottle(ip: string): ThrottleResult {
  const now = Date.now()
  pruneAll(now)

  const ipBurstMax = envInt("LEADS_MAX_PER_IP_BURST", 3, 1, 100)
  const ipDailyMax = envInt("LEADS_MAX_PER_IP_DAY", 10, 1, 500)
  const siteBurstMax = envInt("LEADS_MAX_PER_SITE_BURST", 40, 5, 5000)

  if (ip !== "unknown") {
    const burst = countWithin(ipHits, ip, IP_BURST_WINDOW_MS, now)
    const daily = countWithin(ipHits, ip, DAY_MS, now)
    record(ipHits, ip, now)
    if (burst >= ipBurstMax) {
      return { ok: false, kind: "rate_limited", scope: "ip_burst", retryAfterSeconds: 600 }
    }
    if (daily >= ipDailyMax) {
      return { ok: false, kind: "rate_limited", scope: "ip_daily", retryAfterSeconds: 3600 }
    }
  }

  if (globalHits.length >= siteBurstMax) {
    return { ok: false, kind: "rate_limited", scope: "site_burst", retryAfterSeconds: 300 }
  }
  globalHits.push(now)

  return { ok: true }
}

/** Per-email ceiling and duplicate-body suppression, once the submitted values are known. */
export function checkContentThrottle(args: { email: string; fingerprint: string }): ThrottleResult {
  const now = Date.now()
  const emailDailyMax = envInt("LEADS_MAX_PER_EMAIL_DAY", 5, 1, 500)

  const email = args.email.trim().toLowerCase()
  if (email && countWithin(emailHits, email, DAY_MS, now) >= emailDailyMax) {
    return { ok: false, kind: "rate_limited", scope: "email_daily", retryAfterSeconds: 3600 }
  }

  if (bodyFingerprints.has(args.fingerprint)) {
    return { ok: false, kind: "duplicate" }
  }

  return { ok: true }
}

/** Remember an accepted submission so the same body/email cannot be replayed. */
export function recordAcceptedSubmission(args: { email: string; fingerprint: string }): void {
  const now = Date.now()
  const email = args.email.trim().toLowerCase()
  if (email) record(emailHits, email, now)
  bodyFingerprints.set(args.fingerprint, now)
}

// --------------------------------------------------------------------------------------------
// Content scoring
// --------------------------------------------------------------------------------------------

/** Phrases from the spam we actually receive: SEO/backlink pitches, crypto, adult, loans. */
const SPAM_PHRASES: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /\b(seo|backlink|back-link|link building|guest post|do-?follow)\b/i, weight: 4, label: "seo_pitch" },
  { pattern: /\b(rank(ing)? (higher|on google|#?1)|first page of google|google ranking)\b/i, weight: 4, label: "ranking_pitch" },
  { pattern: /\b(web ?design|website redesign|app development|hire (me|us)|outsourc\w+) (services|company|agency|team)\b/i, weight: 3, label: "agency_pitch" },
  { pattern: /\b(crypto|bitcoin|btc|usdt|ethereum|forex|binary options|trading bot)\b/i, weight: 4, label: "crypto" },
  { pattern: /\b(casino|betting|slots|gambling|poker)\b/i, weight: 4, label: "gambling" },
  { pattern: /\b(viagra|cialis|porn|escort|sex ?cam|adult ?dating|hot ?singles)\b/i, weight: 6, label: "adult" },
  { pattern: /\b(payday loan|quick loan|loan offer|credit repair|debt relief)\b/i, weight: 4, label: "loans" },
  { pattern: /\b(unsubscribe|opt[- ]?out) (from )?(this|these) (email|list)\b/i, weight: 3, label: "bulk_mail" },
  { pattern: /\b(telegram|whatsapp|skype)\s*[:@]/i, weight: 3, label: "offsite_contact" },
  { pattern: /\b(i (found|noticed|came across) your (site|website))\b/i, weight: 3, label: "cold_outreach" },
  { pattern: /\b(increase (your )?(traffic|sales|leads)|drive more traffic|boost your (traffic|sales))\b/i, weight: 3, label: "traffic_pitch" },
  { pattern: /\b(ai (writer|content|agent)s? (tool|platform)|chatgpt (bot|clone))\b/i, weight: 2, label: "ai_pitch" },
]

const LINK_PATTERN = /(https?:\/\/|www\.)/i
/** Separate `g` copy: a global regex keeps `lastIndex` state and must not be shared with `test()`. */
const LINK_COUNT_PATTERN = /(https?:\/\/|www\.)/gi
const MARKUP_LINK_PATTERN = /(\[url[=\]]|<a\s|\[link[=\]]|\bhref\s*=)/i
const SCRIPT_INJECTION_PATTERN = /(<script|javascript:|onerror\s*=|onload\s*=|\{\{.*\}\})/i
const CYRILLIC_OR_CJK_PATTERN = /[\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g
const REPEATED_CHAR_PATTERN = /(.)\1{6,}/
/** Deliberately small: throwaway domains we have actually seen, not a full blocklist. */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "dropmail.me",
  "getnada.com",
  "maildrop.cc",
  "mailnesia.com",
  "throwawaymail.com",
  "fakeinbox.com",
])

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

function upperCaseRatio(text: string): number {
  const letters = text.replace(/[^A-Za-z]/g, "")
  if (letters.length < 20) return 0
  const upper = letters.replace(/[^A-Z]/g, "").length
  return upper / letters.length
}

export function isValidEmailShape(email: string): boolean {
  if (email.length > 254) return false
  return /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[A-Za-z]{2,}$/.test(email)
}

export function looksLikeSpamName(name: string): boolean {
  const cleaned = name.trim()
  if (cleaned.length < 2 || cleaned.length > 80) return true
  if (!/^[\p{L}\p{N} .,'’\-]+$/u.test(cleaned)) return true
  if (/[!@#$%^&*_=+<>]{2,}/.test(cleaned)) return true
  return LINK_PATTERN.test(cleaned)
}

/**
 * Weighted heuristics over the submitted fields. Scores are additive so no single soft signal
 * (one link, one odd phrase) can lose a real lead on its own.
 */
export function scoreInquiryContent(
  content: InquiryContent,
  context: { originTrust: OriginTrust },
): SpamVerdict {
  const reasons: string[] = []
  let score = 0

  const add = (weight: number, reason: string) => {
    score += weight
    reasons.push(reason)
  }

  const message = (content.message ?? "").trim()
  const combined = [content.name, content.company ?? "", message].join("\n")

  if (context.originTrust === "unknown") add(2, "origin_unknown")

  const links = countMatches(combined, LINK_COUNT_PATTERN)
  if (links === 1) add(1, "link_1")
  else if (links === 2) add(2, "links_2")
  else if (links >= 3) add(5, "links_many")

  if (MARKUP_LINK_PATTERN.test(combined)) add(4, "markup_link")
  if (SCRIPT_INJECTION_PATTERN.test(combined)) add(6, "script_injection")

  for (const { pattern, weight, label } of SPAM_PHRASES) {
    if (pattern.test(combined)) add(weight, `phrase_${label}`)
  }

  const nonLatin = countMatches(combined, CYRILLIC_OR_CJK_PATTERN)
  if (nonLatin > 0 && nonLatin / Math.max(combined.length, 1) > 0.2) add(4, "non_latin_body")

  if (REPEATED_CHAR_PATTERN.test(combined)) add(2, "repeated_chars")
  if (upperCaseRatio(message) > 0.7) add(2, "shouting")
  if (message.length > 2500) add(2, "very_long_message")

  const emailDomain = content.email.split("@")[1]?.toLowerCase().trim()
  if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) add(4, "disposable_email")

  const phone = (content.phone ?? "").trim()
  if (phone && (LINK_PATTERN.test(phone) || /[A-Za-z]{3,}/.test(phone))) add(2, "phone_not_a_number")

  const name = content.name.trim().toLowerCase()
  if (name && (name === message.toLowerCase() || name === content.email.toLowerCase())) {
    add(2, "duplicated_fields")
  }
  if (/@/.test(content.name)) add(2, "email_in_name")

  const action: SpamAction =
    score >= DROP_SCORE ? "drop" : score >= QUARANTINE_SCORE ? "quarantine" : "allow"

  return { action, score, reasons }
}