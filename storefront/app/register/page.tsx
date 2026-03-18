"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Button from "../../components/Button"
import { useAuth } from "../../components/AuthContext"
import { getVendureMailboxUrl } from "../../lib/vendure"

const RegisterPage = () => {
  const router = useRouter()
  const { register, user } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState<{ message: string } | null>(null)
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (verificationSent && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [verificationSent])

  // Redirect if already logged in
  if (user) {
    router.push("/account")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    setVerificationSent(null)

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      })

      if (result?.requiresConfirmation) {
        setError("")
        setVerificationSent({
          message:
            result.message ||
            "Account created! Check your email for a verification link, then sign in.",
        })
      } else {
        router.push("/account")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to track orders and manage your account
          </p>
        </div>

        {verificationSent && (
          <div
            ref={successRef}
            className="rounded-xl border-2 border-green-300 bg-green-50/90 p-6 text-green-950 shadow-sm space-y-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-lg text-white" aria-hidden>
                ✓
              </span>
              <div className="min-w-0 space-y-2">
                <h2 className="text-lg font-semibold text-green-900">Almost done — check your email</h2>
                <p className="text-sm leading-relaxed text-green-900">{verificationSent.message}</p>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-green-800 border-t border-green-200 pt-4">
              <li>Look in your <strong>spam</strong> or promotions folder.</li>
              <li>Wait a few minutes — delivery can be delayed.</li>
              <li>
                No message? Submit this form again with the <strong>same email</strong> to resend the link.
              </li>
            </ul>
            {process.env.NODE_ENV === "development" && (
              <p className="text-sm text-green-800 border-t border-green-200 pt-3">
                <strong>Local dev:</strong> Open the{" "}
                <a
                  href={getVendureMailboxUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-semibold"
                >
                  Vendure mailbox
                </a>{" "}
                for the link if SMTP isn&apos;t set up.
              </p>
            )}
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              Continue to sign in
            </Link>
          </div>
        )}

        {!verificationSent && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 space-y-2">
              <p>{error}</p>
              {error.toLowerCase().includes("already exists") && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-xs text-red-700 mb-2">
                    This email is already registered. If you didn't receive a confirmation email:
                  </p>
                  <div className="space-y-1 text-xs">
                    <p>• Try logging in - you may be able to log in without confirmation</p>
                    <p>• Check your spam folder</p>
                    {process.env.NODE_ENV === "development" && (
                      <p>
                        • Get the verification link from{" "}
                        <a href={getVendureMailboxUrl()} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                          Vendure mailbox
                        </a>
                      </p>
                    )}
                    <p>• Contact support if you need help</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        )}

        {!verificationSent && (
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        )}
      </div>
    </div>
  )
}

export default RegisterPage
