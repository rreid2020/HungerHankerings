"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ?? "https://us.i.posthog.com"

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const lastPathRef = useRef<string>("")

  useEffect(() => {
    if (!posthogKey || typeof window === "undefined") return
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
    })
  }, [])

  useEffect(() => {
    if (!posthogKey || typeof window === "undefined") return
    if (!pathname || pathname.startsWith("/ops")) return

    const fullPath = `${pathname}${window.location.search}`
    if (lastPathRef.current === fullPath) return
    lastPathRef.current = fullPath

    posthog.capture("$pageview", {
      path: pathname,
      full_path: fullPath,
      url: window.location.href,
      referrer: document.referrer || "direct",
    })
  }, [pathname])

  return <>{children}</>
}
