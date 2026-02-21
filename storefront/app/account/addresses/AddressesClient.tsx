"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AddressForm from "./AddressForm"

type Address = {
  id: string
  firstName: string
  lastName: string
  streetAddress1: string
  streetAddress2?: string | null
  city: string
  postalCode: string
  country: { code: string; country: string }
  countryArea?: string | null
  phone?: string | null
  isDefaultShippingAddress?: boolean
  isDefaultBillingAddress?: boolean
}

export default function AddressesClient({ addresses }: { addresses: Address[] }) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : null

  const handleSuccess = () => {
    setShowAddForm(false)
    setEditingId(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
        credentials: "include"
      })
      if (res.ok) router.refresh()
      else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? "Failed to delete")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Addresses</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your shipping and billing addresses
          </p>
        </div>
        {!showAddForm && !editingId && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
          >
            Add address
          </button>
        )}
      </div>

      {showAddForm && (
        <AddressForm
          onSuccess={handleSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingId && editingAddress && (
        <AddressForm
          addressId={editingId}
          initialValues={{
            firstName: editingAddress.firstName,
            lastName: editingAddress.lastName,
            streetAddress1: editingAddress.streetAddress1,
            streetAddress2: editingAddress.streetAddress2 ?? "",
            city: editingAddress.city,
            postalCode: editingAddress.postalCode,
            country: editingAddress.country.code,
            countryArea: editingAddress.countryArea ?? "",
            phone: editingAddress.phone ?? ""
          }}
          onSuccess={handleSuccess}
          onCancel={() => setEditingId(null)}
        />
      )}

      {addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-medium text-foreground">
                      {address.firstName} {address.lastName}
                    </h3>
                    {address.isDefaultShippingAddress && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Default Shipping
                      </span>
                    )}
                    {address.isDefaultBillingAddress && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Default Billing
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{address.streetAddress1}</p>
                    {address.streetAddress2 && <p>{address.streetAddress2}</p>}
                    <p>{address.city}, {address.postalCode}</p>
                    {address.countryArea && <p>{address.countryArea}</p>}
                    <p>{address.country.country}</p>
                    {address.phone && <p className="mt-2">Phone: {address.phone}</p>}
                  </div>
                </div>
                {!editingId && !showAddForm && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(address.id)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !showAddForm && !editingId ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">No saved addresses</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first address using the button above or during checkout
          </p>
        </div>
      ) : null}
    </div>
  )
}
