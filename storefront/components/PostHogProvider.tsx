"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import posthog from "posthog-js"

type PostHogProviderProps = {
  children: React.ReactNode
  posthogKey?: string
  posthogHost?: string
}

export default function PostHogProvider({
  children,
  posthogKey = "",
  posthogHost = "https://us.i.posthog.com",
}: PostHogProviderProps) {
  const pathname = usePathname()
  const lastPathRef = useRef<string>("")
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!posthogKey || typeof window === "undefined" || initializedRef.current) return
    initializedRef.current = true
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
    })
    ;(window as Window & { __hhPosthogReady?: boolean }).__hhPosthogReady = true
  }, [posthogHost, posthogKey])

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
