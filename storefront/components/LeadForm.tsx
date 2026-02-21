"use client"

import { FormEvent, useState } from "react"
import Button from "./Button"

type Field = {
  name: string
  label: string
  type?: string
  placeholder?: string
}

type LeadFormProps = {
  type: string
  fields: Field[]
  submitLabel?: string
}

const LeadForm = ({ type, fields, submitLabel = "Submit" }: LeadFormProps) => {
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
        type,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="text-sm font-medium text-iron_grey">
            {field.label}
            <input
              name={field.name}
              type={field.type || "text"}
              placeholder={field.placeholder}
              required={field.name === "name" || field.name === "email"}
              className="mt-2 w-full rounded-md border border-dust_grey-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        ))}
      </div>
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
          {submitLabel}
        </Button>
        {status === "sent" && (
          <span className="text-sm text-iron_grey">
            Thanks! We will be in touch shortly.
          </span>
        )}
        {status === "error" && (
          <span className="text-sm text-light_coral-600">
            Something went wrong. Please try again.
          </span>
        )}
      </div>
    </form>
  )
}

export default LeadForm
