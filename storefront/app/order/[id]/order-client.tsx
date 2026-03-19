"use client"

import { useEffect, useState } from "react"
import type {
  GiftByLineUnit,
  ShippingOverridesByUnit,
  AddressFields
} from "../../../components/CartContext"

const ORDER_STORAGE_KEY = "last_order_v1"

type CartItem = {
  lineId: string
  title: string
  quantity: number
}

type StoredOrder = {
  id?: string
  cart?: { items: CartItem[]; subtotal?: number }
  giftByLineUnit?: GiftByLineUnit
  giftFee?: number
  shippingAmount?: number
  taxAmount?: number
  billing?: Record<string, string>
  shipping?: Record<string, string>
  /** Custom shipping address per box; key = `${lineId}-${unitIndex}` */
  shippingOverridesByUnit?: ShippingOverridesByUnit
}

function formatAddress(a: AddressFields | Record<string, string>): string {
  const parts = [
    (a as Record<string, string>).address_1,
    (a as Record<string, string>).city,
    (a as Record<string, string>).province,
    (a as Record<string, string>).postal_code,
    (a as Record<string, string>).country
  ].filter(Boolean)
  return parts.join(", ") || "—"
}

const OrderClient = ({ fallbackId }: { fallbackId: string }) => {
  const [orderId, setOrderId] = useState<string>(fallbackId)

  useEffect(() => {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) {
      setOrderId(fallbackId)
      return
    }
    try {
      const parsed = JSON.parse(raw) as StoredOrder
      setOrderId(parsed.id || fallbackId)
    } catch {
      setOrderId(fallbackId)
    }
  }, [fallbackId])

  return <>{orderId}</>
}

export default OrderClient

export function OrderGiftDetails() {
  const [order, setOrder] = useState<StoredOrder | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as StoredOrder
      if (parsed.giftByLineUnit && Object.keys(parsed.giftByLineUnit).length > 0) {
        setOrder(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  if (!order?.cart?.items?.length || !order.giftByLineUnit) return null

  const itemsByLineId = new Map(order.cart.items.map((i) => [i.lineId, i]))
  const entries = Object.entries(order.giftByLineUnit)
    .filter(([, v]) => v?.giftMessage)
    .map(([key, v]) => {
      const lastDash = key.lastIndexOf("-")
      const lineId =
        lastDash >= 0 ? key.slice(0, lastDash) : key
      const unitIndex =
        lastDash >= 0 ? parseInt(key.slice(lastDash + 1), 10) : 0
      const item = itemsByLineId.get(lineId)
      const title = item?.title ?? "Box"
      const boxLabel =
        item && item.quantity > 1 ? `${title} — Box ${unitIndex + 1} of ${item.quantity}` : title
      return { boxLabel, message: v.giftMessage }
    })

  if (entries.length === 0) return null

  return (
    <div className="mt-6 rounded-lg border border-dust_grey-200 bg-white p-6">
      <p className="text-sm font-medium text-iron_grey">Gift boxes</p>
      <p className="mt-1 text-sm text-iron_grey">
        The following box(es) will be wrapped as gifts with our custom gift card.
        {order.giftFee != null && order.giftFee > 0 && (
          <> Gift box fee: ${order.giftFee.toFixed(2)} (before tax).</>
        )}
      </p>
      <ul className="mt-4 space-y-4 border-t border-dust_grey-200 pt-4">
        {entries.map((e, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-iron_grey">{e.boxLabel}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-iron_grey">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OrderShippingDetails() {
  const [order, setOrder] = useState<StoredOrder | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as StoredOrder
      if (parsed.cart?.items?.length && parsed.shipping) setOrder(parsed)
    } catch {
      // ignore
    }
  }, [])

  if (!order?.cart?.items?.length || !order.shipping) return null

  const mainShipping = order.shipping as AddressFields
  const overrides = order.shippingOverridesByUnit ?? {}
  const rows: { boxLabel: string; address: AddressFields | Record<string, string> }[] = []
  for (const item of order.cart.items) {
    for (let i = 0; i < item.quantity; i++) {
      const key = `${item.lineId}-${i}`
      const boxLabel =
        item.quantity > 1
          ? `${item.title} — Box ${i + 1} of ${item.quantity}`
          : item.title
      const addr = overrides[key] ?? mainShipping
      rows.push({ boxLabel, address: addr as Record<string, string> })
    }
  }

  const hasAnyCustom = Object.keys(overrides).length > 0
  const totalBoxes = order.cart.items.reduce((s, i) => s + i.quantity, 0)
  if (totalBoxes < 2 && !hasAnyCustom) return null

  return (
    <div className="mt-6 rounded-lg border border-dust_grey-200 bg-white p-6">
      <p className="text-sm font-medium text-iron_grey">Shipping destinations</p>
      <p className="mt-1 text-sm text-iron_grey">
        {hasAnyCustom
          ? "Each box ships to the address below. Shipping and tax were calculated per destination."
          : "All boxes ship to the main shipping address."}
      </p>
      <ul className="mt-4 space-y-3 border-t border-dust_grey-200 pt-4">
        {rows.map((r, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-iron_grey">{r.boxLabel}</p>
            <p className="mt-0.5 text-sm text-iron_grey">{formatAddress(r.address)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
