"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { giftSurchargeNetMajorFromInclusiveGrossDollars } from "../../../lib/checkout-gift-surcharge"
import { CANADIAN_PROVINCES } from "../../../lib/shippingTax"
import { storefrontDisplayCurrency, type StorefrontOrder } from "../../../lib/vendure"

const ORDER_STORAGE_KEY = "vendure_last_order_v1"

/** Stay below nginx `proxy_read_timeout` so the UI falls back to localStorage instead of hanging. */
const ORDER_FETCH_TIMEOUT_MS = 25_000

type StoredCheckout = {
  orderToken?: string
  orderNumber?: string
  createdAccount?: boolean
  orderSummary?: {
    email: string
    total: number
    currency: string
    subTotalNet?: number
    subTotalGross?: number
    shippingNet?: number
    shippingGross?: number
    taxEstimate?: number
    giftPackagingNet?: number
    giftPackagingAmount?: number
    giftLineMessages?: { unitKey: string; message: string }[]
    amountPaid?: number
    taxLines?: { description: string; taxRate: number; taxTotal: number }[]
    lines: {
      /** Vendure order line id; matches gift `unitKey` prefix `${lineId}-${unitIndex}`. */
      lineId?: string
      productName: string
      variantName: string | null
      quantity: number
      unitPrice: number
      lineTotalNet?: number
      lineTotalWithTax?: number
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

function moneyFmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: storefrontDisplayCurrency(currency),
  }).format(amount)
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

function readStoredCheckoutForCode(orderCode: string): StoredCheckout | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(ORDER_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredCheckout
    const token = parsed.orderToken ?? parsed.orderNumber
    if (token === orderCode && parsed.orderSummary) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}

function provinceDisplayName(code: string | null | undefined): string {
  const c = code?.trim().toUpperCase() ?? ""
  if (!c) return ""
  return CANADIAN_PROVINCES.find((p) => p.code === c)?.name ?? c
}

/** Vendure may send 13 for 13% or 0.13 for 13%. */
function formatTaxRatesForLabel(rates: number[]): string {
  const parts = rates
    .filter((r) => Number.isFinite(r) && r > 0)
    .map((r) => {
      const pct = r > 0 && r < 1 ? r * 100 : r
      const rounded = Math.abs(pct - Math.round(pct)) < 0.001 ? Math.round(pct) : pct
      return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2)}%`
    })
  return [...new Set(parts)].join(" + ")
}

function taxTotalRowLabel(
  taxLines: { description: string; taxRate: number; taxTotal: number }[] | undefined,
  provinceCode: string | null | undefined
): string {
  const rates = taxLines?.length ? taxLines.map((t) => t.taxRate) : []
  const rateStr = formatTaxRatesForLabel(rates)
  const code = provinceCode?.trim().toUpperCase() ?? ""
  const name = provinceDisplayName(code)
  if (name && code && rateStr) return `Tax (total) — ${name} (${code}), ${rateStr}`
  if (name && code) return `Tax (total) — ${name} (${code})`
  if (rateStr) return `Tax (total) — ${rateStr}`
  return "Tax (total)"
}

/** Gift keys are `${orderLineId}-${unitIndex}` (see checkout `unitKey`). */
function parseGiftUnitKey(unitKey: string): { lineId: string; unitIndex: number } | null {
  const lastDash = unitKey.lastIndexOf("-")
  if (lastDash < 0) return null
  const lineId = unitKey.slice(0, lastDash)
  const unitStr = unitKey.slice(lastDash + 1)
  const unitIndex = Number.parseInt(unitStr, 10)
  if (!Number.isFinite(unitIndex) || String(unitIndex) !== unitStr) return null
  return { lineId, unitIndex }
}

function lineTitle(l: { productName: string; variantName?: string | null }): string {
  const v = l.variantName?.trim()
  return v ? `${l.productName} — ${v}` : l.productName
}

function giftMessageCaption(
  unitKey: string,
  orderLines: StorefrontOrder["lines"] | undefined,
  summaryLines: NonNullable<StoredCheckout["orderSummary"]>["lines"] | undefined,
): string {
  const parsed = parseGiftUnitKey(unitKey)
  if (!parsed) return "Gift message"

  if (orderLines?.length) {
    const line = orderLines.find((l) => l.id === parsed.lineId)
    if (line) {
      const title = lineTitle(line)
      return line.quantity > 1
        ? `${title} — Box ${parsed.unitIndex + 1} of ${line.quantity}`
        : title
    }
  }

  if (summaryLines?.length) {
    const withId = summaryLines.find((l) => l.lineId === parsed.lineId)
    if (withId) {
      const title = lineTitle(withId)
      return withId.quantity > 1
        ? `${title} — Box ${parsed.unitIndex + 1} of ${withId.quantity}`
        : title
    }
    if (summaryLines.length === 1) {
      const only = summaryLines[0]
      const title = lineTitle(only)
      return only.quantity > 1
        ? `${title} — Box ${parsed.unitIndex + 1} of ${only.quantity}`
        : title
    }
  }

  return "Gift message"
}

function fallbackGiftPackagingExTax(s: NonNullable<StoredCheckout["orderSummary"]>): number {
  if (typeof s.giftPackagingNet === "number" && s.giftPackagingNet > 0) {
    return s.giftPackagingNet
  }
  const prov = s.shippingAddress?.countryArea ?? ""
  if (typeof s.giftPackagingAmount === "number" && s.giftPackagingAmount > 0) {
    return giftSurchargeNetMajorFromInclusiveGrossDollars(s.giftPackagingAmount, "CA", prov)
  }
  return 0
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
          signal: AbortSignal.timeout(ORDER_FETCH_TIMEOUT_MS),
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
        const fromStorage = readStoredCheckoutForCode(orderCode)
        if (fromStorage) {
          setFallback(fromStorage)
          setLoading(false)
          return
        }
        setError(data?.error ?? "We couldn’t load this order. Check your email for confirmation.")
      } catch (e) {
        if (!cancelled) {
          const fromStorage = readStoredCheckoutForCode(orderCode)
          if (fromStorage) {
            setFallback(fromStorage)
          } else {
            const msg =
              e instanceof Error && e.name === "TimeoutError"
                ? "Order lookup timed out. Try refreshing, or check your email for confirmation."
                : "Could not load order details."
            setError(msg)
          }
        }
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
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg animate-pulse rounded-2xl border border-border bg-card p-8">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="mt-4 h-4 w-full rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (order) {
    const c = storefrontDisplayCurrency(order.currencyCode || order.total.gross.currency)
    const taxTotalPaid = order.taxSummary.reduce((s, t) => s + t.taxTotal.amount, 0)
    const displayTotal =
      order.amountPaid && order.amountPaid.amount > 0 ? order.amountPaid.amount : order.total.gross.amount
    const taxLabelRows = order.taxSummary.map((t) => ({
      description: t.description,
      taxRate: t.taxRate,
      taxTotal: t.taxTotal.amount,
    }))
    const provCode = order.shippingAddress?.countryArea ?? null

    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-brand-50/40 via-background to-background">
        <div className="container-page py-12 md:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-brand-200/60 bg-card/95 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Thank you</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Payment successful
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Order <span className="font-mono font-semibold text-foreground">#{order.number}</span> is
                confirmed. You should receive a confirmation email at the address you used at checkout. If
                nothing arrives within a few minutes, check your spam folder.
              </p>

              <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Order summary
                </h2>
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {order.lines?.map((line) => (
                    <li key={line.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                      <span className="text-foreground">
                        {line.productName}
                        {line.variantName ? ` — ${line.variantName}` : ""}{" "}
                        <span className="text-muted-foreground">× {line.quantity}</span>
                      </span>
                      <span className="tabular-nums font-medium text-foreground">
                        {moneyFmt(line.lineTotalNet.amount, c)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-border pt-2">
                  <Row label="Shipping (ex. tax)" value={moneyFmt(order.shipping.net.amount, c)} />
                  {order.giftPackaging && order.giftPackaging.amount > 0 ? (
                    <Row
                      label="Gift packaging (ex. tax)"
                      value={moneyFmt(order.giftPackaging.amount, c)}
                    />
                  ) : null}
                  <Row
                    label="Subtotal (ex. tax)"
                    value={moneyFmt(order.totalExTax.amount, c)}
                  />
                  {taxTotalPaid > 0 ? (
                    <Row
                      label={taxTotalRowLabel(taxLabelRows, provCode)}
                      value={moneyFmt(taxTotalPaid, c)}
                    />
                  ) : null}
                  <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-semibold">
                    <span>{order.amountPaid ? "Total charged" : "Order total"}</span>
                    <span className="tabular-nums">{moneyFmt(displayTotal, c)}</span>
                  </div>
                </div>
              </div>

              {order.giftLineMessages.length > 0 ? (
                <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 dark:bg-amber-950/20">
                  <h2 className="text-sm font-semibold text-foreground">Gift messages</h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    {order.giftLineMessages.map((g) => (
                      <li key={g.unitKey} className="rounded-lg bg-background/80 px-3 py-2 ring-1 ring-border">
                        <span className="text-xs font-medium text-muted-foreground">
                          {giftMessageCaption(g.unitKey, order.lines, undefined)}
                        </span>
                        <p className="mt-1 text-foreground">{g.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {order.shippingAddress ? (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Shipping address
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {formatAddress(order.shippingAddress)}
                    </p>
                  </div>
                ) : null}
                {order.billingAddress ? (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Billing address
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {formatAddress(order.billingAddress)}
                    </p>
                  </div>
                ) : null}
              </div>

              <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <Link href="/themed-snack-boxes" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                  Continue shopping
                </Link>
                <span aria-hidden className="text-border">
                  ·
                </span>
                <Link href="/account/orders" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                  View all orders
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (fallback?.orderSummary) {
    const s = fallback.orderSummary
    const c = storefrontDisplayCurrency(s.currency)
    const taxTotalPaid =
      s.taxLines?.reduce((acc, t) => acc + t.taxTotal, 0) ??
      (typeof s.taxEstimate === "number" ? s.taxEstimate : 0)
    const giftEx = fallbackGiftPackagingExTax(s)

    const lineExValue = (line: (typeof s.lines)[number]): number => {
      if (typeof line.lineTotalNet === "number" && !Number.isNaN(line.lineTotalNet)) {
        return line.lineTotalNet
      }
      if (s.lines.length === 1 && typeof s.subTotalNet === "number") {
        return s.subTotalNet
      }
      return line.unitPrice * line.quantity
    }

    const productsExFallback =
      typeof s.subTotalNet === "number"
        ? s.subTotalNet
        : s.lines.reduce((sum, line) => sum + lineExValue(line), 0)
    const shipProv = s.shippingAddress?.countryArea ?? ""
    const shipExFallback =
      typeof s.shippingNet === "number"
        ? s.shippingNet
        : typeof s.shippingGross === "number" && s.shippingGross > 0
          ? giftSurchargeNetMajorFromInclusiveGrossDollars(s.shippingGross, "CA", shipProv)
          : 0
    const preTaxSubtotalFallback = productsExFallback + shipExFallback + giftEx

    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-brand-50/40 via-background to-background">
        <div className="container-page py-12 md:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-brand-200/60 bg-card/95 p-8 shadow-sm ring-1 ring-black/5 md:p-10">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Payment successful</h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Thank you! Order{" "}
                <span className="font-mono font-semibold text-foreground">
                  #{fallback.orderNumber ?? orderCode}
                </span>{" "}
                was placed. You should receive a confirmation email at{" "}
                <span className="font-medium text-foreground">{s.email}</span>. If it doesn&apos;t arrive within a
                few minutes, check your spam folder. This summary was saved in your browser — refresh or sign in
                to load full order details if they don&apos;t appear.
              </p>

              <div className="mt-8 rounded-xl border border-border bg-muted/30 p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {s.lines.map((line, i) => {
                    const lineEx = lineExValue(line)
                    return (
                      <li key={i} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                        <span className="text-foreground">
                          {line.productName}
                          {line.variantName ? ` — ${line.variantName}` : ""} × {line.quantity}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {moneyFmt(lineEx, c)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-2 border-t border-border pt-2">
                  {typeof s.shippingNet === "number" ? (
                    <Row label="Shipping (ex. tax)" value={moneyFmt(s.shippingNet, c)} />
                  ) : typeof s.shippingGross === "number" && s.shippingGross > 0 ? (
                    <Row label="Shipping (incl. tax)" value={moneyFmt(s.shippingGross, c)} />
                  ) : null}
                  {giftEx > 0 ? (
                    <Row label="Gift packaging (ex. tax)" value={moneyFmt(giftEx, c)} />
                  ) : null}
                  <Row label="Subtotal (ex. tax)" value={moneyFmt(preTaxSubtotalFallback, c)} />
                  {taxTotalPaid > 0 ? (
                    <Row
                      label={taxTotalRowLabel(s.taxLines, s.shippingAddress?.countryArea)}
                      value={moneyFmt(taxTotalPaid, c)}
                    />
                  ) : null}
                  <div className="mt-2 flex justify-between border-t border-border pt-4 text-base font-semibold">
                    <span>{typeof s.amountPaid === "number" ? "Total charged" : "Total"}</span>
                    <span className="tabular-nums">
                      {moneyFmt(typeof s.amountPaid === "number" ? s.amountPaid : s.total, c)}
                    </span>
                  </div>
                </div>
              </div>

              {s.giftLineMessages?.length ? (
                <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/50 p-6">
                  <h2 className="text-sm font-semibold text-foreground">Gift messages</h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    {s.giftLineMessages.map((g) => (
                      <li key={g.unitKey} className="rounded-lg bg-background/80 px-3 py-2 ring-1 ring-border">
                        <span className="text-xs font-medium text-muted-foreground">
                          {giftMessageCaption(g.unitKey, undefined, s.lines)}
                        </span>
                        <p className="mt-1 text-foreground">{g.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {s.shippingAddress ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Shipping address
                  </h2>
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
              ) : null}

              <p className="mt-8 text-sm text-muted-foreground">
                <Link href="/themed-snack-boxes" className="font-medium text-brand-600 hover:underline">
                  Continue shopping
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
        <h1 className="text-xl font-semibold text-foreground">Order</h1>
        <p className="mt-3 text-sm text-destructive">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference: <span className="font-mono">{orderCode}</span>
        </p>
        <p className="mt-6 text-sm">
          <Link href="/themed-snack-boxes" className="font-medium text-brand-600 hover:underline">
            Continue shopping
          </Link>
        </p>
      </div>
    </div>
  )
}
