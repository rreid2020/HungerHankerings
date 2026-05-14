"use client"

import posthog from "posthog-js"

export function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false
  return Boolean((posthog as { __loaded?: boolean }).__loaded)
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled()) return
  try {
    posthog.capture(event, properties)
  } catch {
    /* swallow analytics errors so storefront UX is never blocked */
  }
}
