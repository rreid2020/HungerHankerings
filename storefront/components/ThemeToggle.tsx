"use client"

import { useState, useEffect } from "react"
import { getTheme, setTheme } from "../lib/theme"

const THEMES = ["coolors-soft", "alt"] as const

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<string>("coolors-soft")

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  const cycle = () => {
    const idx = THEMES.indexOf(theme as (typeof THEMES)[number])
    const next = THEMES[(idx + 1) % THEMES.length]
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      Theme: {theme}
    </button>
  )
}
