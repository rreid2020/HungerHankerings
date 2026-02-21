"use client"

import { useEffect } from "react"

export function LoginFormScript() {
  useEffect(() => {
    const form = document.getElementById("login-form")
    const btn = document.getElementById("login-submit")
    if (!form || !btn) return
    const onSubmit = () => {
      ;(btn as HTMLButtonElement).disabled = true
      ;(btn as HTMLButtonElement).textContent = "Signing in…"
    }
    form.addEventListener("submit", onSubmit)
    return () => form.removeEventListener("submit", onSubmit)
  }, [])
  return null
}
