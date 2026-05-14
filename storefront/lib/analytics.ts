"use client"

import posthog from "posthog-js"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""

export function analyticsEnabled(): boolean {
  return Boolean(posthogKey)
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled()) return
  if (typeof window === "undefined") return
  try {
    posthog.capture(event, properties)
  } catch {
    /* swallow analytics errors so storefront UX is never blocked */
  }
}
