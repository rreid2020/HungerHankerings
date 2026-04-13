/** Public site name (metadata, JSON-LD). */
export const SITE_NAME = "Hunger Hankerings";

/** Default meta description when a page does not override. */
export const SITE_DEFAULT_DESCRIPTION =
  "Themed snack boxes, corporate team programs, office pantry service, and bulk pallet orders—curated snacks with Canada-wide delivery.";

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * Canonical public origin (no trailing slash). Uses `NEXT_PUBLIC_SITE_URL`, then Vercel, else localhost.
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return trimTrailingSlashes(explicit);
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Absolute URL for a path beginning with `/`. */
export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
