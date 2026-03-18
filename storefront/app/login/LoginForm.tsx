"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getVendureMailboxUrl } from "../../lib/vendure"

type Props = {
  redirectTo: string
  initialError?: string
  confirmed: boolean
  resetSuccess: boolean
}

export function LoginForm({ redirectTo, initialError, confirmed, resetSuccess }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(initialError ?? "")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          redirect: redirectTo,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean }
      if (!res.ok) {
        setError(data.error || "Login failed")
        return
      }
      if (data.success) {
        const target =
          redirectTo?.trim() && redirectTo.startsWith("/") ? redirectTo : "/account"
        router.push(target)
        router.refresh()
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {confirmed && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Account confirmed successfully! You can now log in.
        </div>
      )}
      {resetSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Password reset successfully. You can now sign in with your new password.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 whitespace-pre-line">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      {process.env.NODE_ENV === "development" && (
        <p className="text-center text-xs text-muted-foreground">
          <span className="text-muted-foreground">Dev:</span>{" "}
          <a
            href={getVendureMailboxUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Get verification link from Vendure mailbox
          </a>
        </p>
      )}

      <div className="text-center text-sm text-muted-foreground pt-2 space-y-2">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-primary hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>
    </form>
  )
}
