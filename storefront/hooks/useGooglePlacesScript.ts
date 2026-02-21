"use client"

import { useEffect, useState } from "react"

const SCRIPT_ID = "google-maps-places-script"
const CALLBACK_NAME = "__googleMapsPlacesReady"

const getScriptUrl = (key: string) =>
  `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${CALLBACK_NAME}`

/**
 * Loads the Google Maps JavaScript API with the Places library.
 * Uses the callback parameter so we only set isLoaded when the API is actually ready.
 * Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
export function useGooglePlacesScript(): { isLoaded: boolean } {
  const [isLoaded, setIsLoaded] = useState(false)
  const key =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "")
      : ""

  useEffect(() => {
    if (!key) return

    if (typeof window === "undefined") return

    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as
      | HTMLScriptElement
      | undefined
    if (existing) {
      // Script already in page; API may be ready or still loading
      const check = () => {
        if (window.google?.maps?.places) {
          setIsLoaded(true)
          return true
        }
        return false
      }
      if (check()) return
      let attempts = 0
      const id = setInterval(() => {
        if (check() || ++attempts > 50) clearInterval(id)
      }, 100)
      return () => clearInterval(id)
    }

    type WindowWithCallback = Window & { [CALLBACK_NAME]?: () => void }
    const win = window as WindowWithCallback
    const prevCallback = win[CALLBACK_NAME]
    win[CALLBACK_NAME] = () => {
      try {
        setIsLoaded(true)
      } finally {
        win[CALLBACK_NAME] = prevCallback
      }
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = getScriptUrl(key)
    script.async = true
    script.defer = true
    script.onerror = () => {
      win[CALLBACK_NAME] = prevCallback
      setIsLoaded(false)
    }
    document.head.appendChild(script)

    return () => {
      script.onerror = null
      win[CALLBACK_NAME] = prevCallback
    }
  }, [key])

  return { isLoaded: !!key && isLoaded }
}
