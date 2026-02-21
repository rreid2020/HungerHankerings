"use client"

import { useState } from "react"
import Link from "next/link"
import Button from "../../components/Button"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Request failed" })
        return
      }

      setMessage({
        type: "success",
        text: data.message || "If an account exists with this email, you will receive a password reset link.",
      })
      setEmail("")
    } catch {
      setMessage({ type: "error", text: "Request failed. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div
              className={`rounded-md border p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to Login
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <p className="text-center text-xs text-muted-foreground">
            Dev: Check Mailpit at{" "}
            <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              http://localhost:8025
            </a>{" "}
            for the reset email.
          </p>
        )}
      </div>
    </div>
  )
}
