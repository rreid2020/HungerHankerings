"use client"

import { useEffect } from "react"
import { initTheme } from "../lib/theme"

export default function ThemeInit({
  children
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    initTheme()
  }, [])
  return <>{children}</>
}
