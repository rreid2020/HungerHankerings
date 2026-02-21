"use client"

import { useState } from "react"
import { CANADIAN_PROVINCES } from "../../../lib/shippingTax"

type AddressFormData = {
  firstName: string
  lastName: string
  streetAddress1: string
  streetAddress2: string
  city: string
  postalCode: string
  country: string
  countryArea: string
  phone: string
  setAsDefaultShipping: boolean
  setAsDefaultBilling: boolean
}

const emptyForm: AddressFormData = {
  firstName: "",
  lastName: "",
  streetAddress1: "",
  streetAddress2: "",
  city: "",
  postalCode: "",
  country: "CA",
  countryArea: "",
  phone: "",
  setAsDefaultShipping: false,
  setAsDefaultBilling: false
}

const inputClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

export default function AddressForm({
  initialValues,
  addressId,
  onSuccess,
  onCancel
}: {
  initialValues?: Partial<AddressFormData>
  addressId?: string | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const isEdit = !!addressId
  const [form, setForm] = useState<AddressFormData>({
    ...emptyForm,
    ...initialValues,
    setAsDefaultShipping: initialValues?.setAsDefaultShipping ?? false,
    setAsDefaultBilling: initialValues?.setAsDefaultBilling ?? false
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const url = addressId ? `/api/account/addresses/${addressId}` : "/api/account/addresses"
      const method = addressId ? "PATCH" : "POST"
      const body: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        streetAddress1: form.streetAddress1.trim(),
        streetAddress2: form.streetAddress2.trim() || undefined,
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country || "CA",
        countryArea: form.countryArea.trim() || undefined,
        phone: form.phone.trim() || undefined
      }
      if (!isEdit) {
        body.setAsDefaultShipping = form.setAsDefaultShipping
        body.setAsDefaultBilling = form.setAsDefaultBilling
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">{isEdit ? "Edit address" : "Add new address"}</h3>
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-firstName" className="block text-sm font-medium text-foreground mb-1">First name</label>
          <input id="addr-firstName" className={inputClass + " w-full"} required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="addr-lastName" className="block text-sm font-medium text-foreground mb-1">Last name</label>
          <input id="addr-lastName" className={inputClass + " w-full"} required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </div>
      </div>
      <div>
        <label htmlFor="addr-street1" className="block text-sm font-medium text-foreground mb-1">Address</label>
        <input id="addr-street1" className={inputClass + " w-full"} required value={form.streetAddress1} onChange={(e) => setForm((f) => ({ ...f, streetAddress1: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="addr-street2" className="block text-sm font-medium text-foreground mb-1">Address line 2 (optional)</label>
        <input id="addr-street2" className={inputClass + " w-full"} value={form.streetAddress2} onChange={(e) => setForm((f) => ({ ...f, streetAddress2: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-city" className="block text-sm font-medium text-foreground mb-1">City</label>
          <input id="addr-city" className={inputClass + " w-full"} required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="addr-province" className="block text-sm font-medium text-foreground mb-1">Province / State</label>
          {form.country === "CA" ? (
            <select id="addr-province" className={inputClass + " w-full"} value={form.countryArea} onChange={(e) => setForm((f) => ({ ...f, countryArea: e.target.value }))}>
              <option value="">Select</option>
              {CANADIAN_PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          ) : (
            <input id="addr-province" className={inputClass + " w-full"} value={form.countryArea} onChange={(e) => setForm((f) => ({ ...f, countryArea: e.target.value }))} placeholder="State / Province" />
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addr-postal" className="block text-sm font-medium text-foreground mb-1">Postal code</label>
          <input id="addr-postal" className={inputClass + " w-full"} required value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="addr-country" className="block text-sm font-medium text-foreground mb-1">Country</label>
          <select id="addr-country" className={inputClass + " w-full"} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="addr-phone" className="block text-sm font-medium text-foreground mb-1">Phone (optional)</label>
        <input id="addr-phone" type="tel" className={inputClass + " w-full"} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>
      {!isEdit && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.setAsDefaultShipping} onChange={(e) => setForm((f) => ({ ...f, setAsDefaultShipping: e.target.checked }))} className="rounded border-border" />
            <span className="text-sm text-foreground">Set as default shipping address</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.setAsDefaultBilling} onChange={(e) => setForm((f) => ({ ...f, setAsDefaultBilling: e.target.checked }))} className="rounded border-border" />
            <span className="text-sm text-foreground">Set as default billing address</span>
          </label>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add address"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}
