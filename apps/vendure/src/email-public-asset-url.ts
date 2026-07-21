/**
 * Email clients cannot load Docker-internal hosts (`vendure:3000`), ops hosts, or private Spaces URLs.
 * Always emit storefront-origin `/assets/…` URLs (Nginx → Vendure AssetServer).
 */

function publicSiteOrigin(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Prefix used by AssetServerPlugin `assetUrlPrefix` and email image rewriting. */
export function publicAssetUrlPrefix(): string {
  return `${publicSiteOrigin()}/assets/`;
}

/**
 * Turn a relative asset id or any absolute `/assets/…` (or Spaces) URL into a public absolute URL.
 */
export function toPublicAssetUrl(preview: string): string {
  const raw = preview.trim();
  if (!raw) return "";

  const publicBase = publicSiteOrigin();
  const assetsPrefix = publicAssetUrlPrefix();

  if (raw.startsWith("/assets/")) {
    return `${publicBase}${raw}`;
  }
  if (raw.startsWith("assets/")) {
    return `${publicBase}/${raw}`;
  }

  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host.endsWith(".digitaloceanspaces.com") || host.includes(".cdn.digitaloceanspaces.com")) {
      const p = u.pathname || "";
      if (p.startsWith("/assets/")) {
        return `${publicBase}${p}`;
      }
      if (p.length > 1) {
        return `${publicBase}/assets${p}`;
      }
    }
    if (u.pathname.startsWith("/assets/")) {
      return `${publicBase}${u.pathname}`;
    }
    // Already under our public assets prefix
    if (raw.startsWith(assetsPrefix)) {
      return raw.split("?")[0] || raw;
    }
  } catch {
    /* relative storage key, e.g. preview/ab/cd.jpg */
  }

  // Relative storage identifier from Asset.preview before/after toAbsoluteUrl
  const withoutLeadingSlash = raw.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("http://") || withoutLeadingSlash.startsWith("https://")) {
    return raw;
  }
  return `${assetsPrefix}${withoutLeadingSlash}`;
}

/** Absolute product thumb URL for MJML emails (safe query append). */
export function toEmailLineImageUrl(preview: string | null | undefined, size = 100): string {
  if (!preview) return "";
  const absolute = toPublicAssetUrl(preview);
  if (!absolute) return "";
  const base = absolute.split("#")[0] || absolute;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}w=${size}&h=${size}&mode=crop`;
}
