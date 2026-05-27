"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Button from "../../../components/Button"
import { useAuth } from "../../../components/AuthContext"
import { getVendureMailboxUrl } from "../../../lib/vendure"

const planLabels: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register, user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState({
    plan: "",
    companyName: "",
    teamSize: "",
    industry: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState<{ message: string } | null>(null)
  const successRef = useRef<HTMLDivElement>(null)

  const selectedPlan = useMemo(() => {
    const raw = (searchParams.get("plan") || "").trim().toLowerCase()
    return raw && planLabels[raw] ? raw : ""
  }, [searchParams])

  useEffect(() => {
    if (!selectedPlan) {
      router.replace("/register")
      return
    }
    setFormData((prev) => ({ ...prev, plan: selectedPlan }))
  }, [router, selectedPlan])

  useEffect(() => {
    if (verificationSent && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [verificationSent])

  if (user) {
    router.push("/account")
    return null
  }

  function continueToAccountStep(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!formData.companyName.trim()) {
      setError("Company/Firm name is required")
      return
    }
    if (!formData.teamSize.trim()) {
      setError("Team size is required")
      return
    }
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
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
        lastName: formData.lastName,
      })

      if (result?.requiresConfirmation) {
        setVerificationSent({
          message:
            result.message ||
            "Account created. Check your email for a verification link, then sign in to access your company portal.",
        })
      } else {
        router.push("/account")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {step === 1 ? "Onboarding Step 1 of 2" : "Onboarding Step 2 of 2"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            {step === 1 ? "Company/Firm Onboarding" : "Create Administrator Account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selected plan:{" "}
            <span className="font-semibold text-foreground">
              {planLabels[formData.plan] ?? "Unknown"}
            </span>
          </p>
        </div>

        {verificationSent && (
          <div
            ref={successRef}
            className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold text-emerald-900">Almost done - check your email</h2>
            <p className="text-sm">{verificationSent.message}</p>
            <p className="text-xs text-emerald-800">
              After verification, sign in and you will be redirected to your company portal.
            </p>
            {process.env.NODE_ENV === "development" ? (
              <p className="text-xs text-emerald-800">
                Local dev mailbox:{" "}
                <a
                  href={getVendureMailboxUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  open inbox
                </a>
              </p>
            ) : null}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Continue to Sign in
            </Link>
          </div>
        )}

        {!verificationSent && step === 1 ? (
          <form onSubmit={continueToAccountStep} className="space-y-4 rounded-xl border border-border bg-card p-5">
            {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <div>
              <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-foreground">
                Company/Firm Name
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="teamSize" className="mb-1 block text-sm font-medium text-foreground">
                  Team Size
                </label>
                <select
                  id="teamSize"
                  required
                  value={formData.teamSize}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select team size</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201+">201+</option>
                </select>
              </div>
              <div>
                <label htmlFor="industry" className="mb-1 block text-sm font-medium text-foreground">
                  Industry (optional)
                </label>
                <input
                  id="industry"
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <Link href="/register" className="text-sm font-medium text-primary hover:underline">
                Back to plans
              </Link>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        ) : null}

        {!verificationSent && step === 2 ? (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
            {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-foreground">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-foreground">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Back
              </button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </div>
          </form>
        ) : null}

        {!verificationSent ? (
          <p className="text-center text-sm text-muted-foreground">
            Already have a portal account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
