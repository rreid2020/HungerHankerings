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
  const lastUrlRef = useRef<string>("")
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

    const currentUrl = window.location.href
    const referrer = lastUrlRef.current || document.referrer || ""
    let referringDomain: string | undefined
    if (referrer) {
      try {
        referringDomain = new URL(referrer).hostname
      } catch {
        referringDomain = undefined
      }
    }

    posthog.capture("$pageview", {
      $current_url: currentUrl,
      $pathname: window.location.pathname,
      $host: window.location.host,
      ...(referrer ? { $referrer: referrer } : {}),
      ...(referringDomain ? { $referring_domain: referringDomain } : {}),
      path: pathname,
      full_path: fullPath,
    })
    lastUrlRef.current = currentUrl
  }, [pathname])

  return <>{children}</>
}
