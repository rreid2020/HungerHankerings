"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { StorefrontOrder } from "../../../lib/vendure"

const ORDER_STORAGE_KEY = "vendure_last_order_v1"

type StoredCheckout = {
  orderToken?: string
  orderNumber?: string
  createdAccount?: boolean
  orderSummary?: {
    email: string
    total: number
    currency: string
    lines: {
      productName: string
      variantName: string | null
      quantity: number
      unitPrice: number
    }[]
    shippingAddress?: {
      firstName: string
      lastName: string
      streetAddress1: string
      city: string
      postalCode: string
      countryArea?: string | null
    } | null
  }
}

function formatAddress(addr: NonNullable<StorefrontOrder["shippingAddress"]>): string {
  const parts = [
    [addr.firstName, addr.lastName].filter(Boolean).join(" "),
    addr.streetAddress1,
    addr.city,
    addr.countryArea,
    addr.postalCode,
    addr.country?.country ?? addr.country?.code,
  ].filter(Boolean)
  return parts.join(", ") || "—"
}

export default function OrderConfirmationClient({ orderCode }: { orderCode: string }) {
  const [order, setOrder] = useState<StorefrontOrder | null>(null)
  const [fallback, setFallback] = useState<StoredCheckout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/orders/by-code/${encodeURIComponent(orderCode)}`, {
          credentials: "include",
        })
        const data = (await res.json().catch(() => ({}))) as {
          order?: StorefrontOrder
          error?: string
        }
        if (cancelled) return
        if (res.ok && data.order) {
          setOrder(data.order)
          setLoading(false)
          return
        }
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(ORDER_STORAGE_KEY) : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as StoredCheckout
            const token = parsed.orderToken ?? parsed.orderNumber
            if (token === orderCode && parsed.orderSummary) {
              setFallback(parsed)
              setLoading(false)
              return
            }
          } catch {
            /* ignore */
          }
        }
        setError(data?.error ?? "We couldn’t load this order. Check your email for confirmation.")
      } catch {
        if (!cancelled) setError("Could not load order details.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [orderCode])

  if (loading) {
    return (
      <div className="container-page py-12">
        <p className="text-sm text-muted-foreground">Loading your order…</p>
      </div>
    )
  }

  if (order) {
    return (
      <div className="container-page py-12">
        <h1 className="text-3xl font-semibold text-foreground">Payment successful</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you! A confirmation email will be sent to the address you used at checkout (when email is
          configured on the server).
        </p>
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Order number</p>
            <p className="text-lg font-semibold text-foreground">#{order.number}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Order details</h2>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
              {order.lines?.map((line) => (
                <li key={line.id} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {line.productName}
                    {line.variantName ? ` — ${line.variantName}` : ""} × {line.quantity}
                  </span>
                  <span className="text-foreground">
                    ${(line.unitPrice?.gross?.amount ?? 0).toFixed(2)}{" "}
                    {line.unitPrice?.gross?.currency ?? "CAD"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-border pt-4 font-semibold text-foreground">
              <span>Total</span>
              <span>
                ${(order.total?.gross?.amount ?? 0).toFixed(2)} {order.total?.gross?.currency ?? "CAD"}
              </span>
            </p>
          </div>
          {order.shippingAddress && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Shipping address</h2>
              <p className="mt-2 text-sm text-muted-foreground">{formatAddress(order.shippingAddress)}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <Link href="/shop" className="text-primary hover:underline">
              Continue shopping
            </Link>
            {" · "}
            <Link href="/account/orders" className="text-primary hover:underline">
              View all orders
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (fallback?.orderSummary) {
    const s = fallback.orderSummary
    return (
      <div className="container-page py-12">
        <h1 className="text-3xl font-semibold text-foreground">Payment successful</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you! Your order <span className="font-medium text-foreground">#{fallback.orderNumber ?? orderCode}</span>{" "}
          was placed. We’ll email {s.email} when outgoing mail is configured on the server.
        </p>
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Order details</h2>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
              {s.lines.map((line, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-foreground">
                    {line.productName}
                    {line.variantName ? ` — ${line.variantName}` : ""} × {line.quantity}
                  </span>
                  <span className="text-foreground">
                    ${(line.unitPrice * line.quantity).toFixed(2)} {s.currency}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-border pt-4 font-semibold text-foreground">
              <span>Total</span>
              <span>
                ${s.total.toFixed(2)} {s.currency}
              </span>
            </p>
          </div>
          {s.shippingAddress && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Shipping address</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {[
                  [s.shippingAddress.firstName, s.shippingAddress.lastName].filter(Boolean).join(" "),
                  s.shippingAddress.streetAddress1,
                  s.shippingAddress.city,
                  s.shippingAddress.countryArea,
                  s.shippingAddress.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            <Link href="/shop" className="text-primary hover:underline">
              Continue shopping
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-semibold text-foreground">Order</h1>
      <p className="mt-4 text-sm text-destructive">{error}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Reference: <span className="font-mono">{orderCode}</span>
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/shop" className="text-primary hover:underline">
          Continue shopping
        </Link>
      </p>
    </div>
  )
}
