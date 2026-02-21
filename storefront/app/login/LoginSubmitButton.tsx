"use client"

import { useFormStatus } from "react-dom"

export function LoginSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      id="login-submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? "Signing in…" : "Sign In"}
    </button>
  )
}
