"use client"

import { FormEvent, useState } from "react"
import Button from "../../components/Button"

const ContactPage = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "contact",
        ...payload
      })
    })

    if (!response.ok) {
      setStatus("error")
      return
    }

    event.currentTarget.reset()
    setStatus("sent")
  }

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="section-subtitle">Contact</p>
        <h1 className="text-3xl font-semibold text-iron_grey">
          Let us build your snack plan
        </h1>
        <p className="mt-3 text-sm text-iron_grey">
          Share your goals and we will follow up with a curated proposal.
        </p>
      </div>
      <div className="rounded-3xl border border-dust_grey-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="text-sm font-medium text-iron_grey">
            Name
            <input
              name="name"
              required
              className="mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm font-medium text-iron_grey">
            Email
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm font-medium text-iron_grey">
            Company
            <input
              name="company"
              className="mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm font-medium text-iron_grey">
            Message
            <textarea
              name="message"
              rows={4}
              className="mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <div className="flex items-center gap-4">
            <Button type="submit" variant="secondary">
              Send message
            </Button>
            {status === "sent" && (
              <span className="text-sm text-cherry_blossom">Thanks!</span>
            )}
            {status === "error" && (
              <span className="text-sm text-light_coral-600">
                Something went wrong.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ContactPage
