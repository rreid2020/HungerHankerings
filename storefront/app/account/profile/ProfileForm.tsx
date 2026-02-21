"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ProfileForm({
  initialFirstName,
  initialLastName,
  email,
  isConfirmed
}: {
  initialFirstName: string
  initialLastName: string
  email: string
  isConfirmed: boolean
}) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    "rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Update your name</h2>
        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>
        )}
        {saved && (
          <p className="text-sm text-green-600 mb-4" role="status">Profile updated.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-firstName" className="block text-sm font-medium text-foreground mb-1">First name</label>
            <input
              id="profile-firstName"
              className={inputClass}
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="profile-lastName" className="block text-sm font-medium text-foreground mb-1">Last name</label>
            <input
              id="profile-lastName"
              className={inputClass}
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Email</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        {!isConfirmed && (
          <p className="mt-1 text-xs text-orange-600">
            Your email is not confirmed. Please check your inbox for a confirmation email.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Email cannot be changed here. Contact support if you need to update it.</p>
      </div>
    </form>
  )
}
