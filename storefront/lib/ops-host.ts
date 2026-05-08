/** Strip port and lowercase for comparison. */
export function normalizeHostname(host: string): string {
  return host.split(":")[0].trim().toLowerCase()
}

/**
 * Ops/staff portal hostname (no protocol, no path).
 * Prefer `OPS_HOST`; also accepts `INTERNAL_OPS_HOST` (same value as nginx) and `NEXT_PUBLIC_OPS_HOST`
 * (needed for Edge middleware redirects when runtime-only vars are not visible to the middleware bundle).
 */
export function getConfiguredOpsHostname(): string | null {
  const raw =
    process.env.OPS_HOST?.trim() ||
    process.env.INTERNAL_OPS_HOST?.trim() ||
    process.env.NEXT_PUBLIC_OPS_HOST?.trim() ||
    ""
  return raw ? normalizeHostname(raw) : null
}

export function isOpsHostname(hostHeader: string | null): boolean {
  const configured = getConfiguredOpsHostname()
  if (!configured || !hostHeader) return false
  return normalizeHostname(hostHeader) === configured
}

export function isOpsRequestHeaders(headers: { get(name: string): string | null }): boolean {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? ""
  const host = headers.get("host")?.split(",")[0]?.trim() ?? ""
  return isOpsHostname(forwarded) || isOpsHostname(host)
}

/** Public storefront origin (for links to Vendure Admin on the primary domain). */
export function getStorefrontPublicOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.APP_URL?.trim() || ""
  return explicit.replace(/\/+$/, "")
}

export function getVendureAdminUrl(): string {
  const base = getStorefrontPublicOrigin()
  return base ? `${base}/admin` : "http://localhost:3000/admin"
}
