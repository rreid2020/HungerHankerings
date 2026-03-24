"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"
import { clearCheckoutDraftFromBrowser } from "../lib/checkout-draft"
import {
  checkoutLineDelete,
  checkoutLineUpdate,
  checkoutLinesAdd,
  createCheckout,
  getActiveOrder
} from "../lib/vendure"

type CartItem = {
  id: string
  title: string
  quantity: number
  unitPrice: number
  lineId: string
  image?: string | null
}

type Cart = {
  items: CartItem[]
  /** Sum of line totals excluding tax (matches Vendure `subTotal` when order is synced). */
  subtotal: number
  total: number
  /** Shipping excluding tax (Vendure `shipping` or storefront quote, dollars). */
  shippingTotal: number
  /** From Vendure when present — for reconciling tax when not using client-side tax math. */
  subtotalWithTax?: number
  shippingWithTax?: number
}

export type AddressFields = {
  first_name: string
  last_name: string
  email: string
  address_1: string
  city: string
  province: string
  postal_code: string
  country: string
}

/** Per unit: key = `${lineId}-${unitIndex}` -> gift card message (only when gift selected for that box) */
export type GiftByLineUnit = Record<string, { giftMessage: string }>

/** Per unit: key = `${lineId}-${unitIndex}` -> custom shipping address; null/missing = use main shipping */
export type ShippingOverridesByUnit = Record<string, AddressFields | null>

export type CheckoutOptions = {
  giftByLineUnit?: GiftByLineUnit
  giftFee?: number
  /** Boxes with gift wrap/card; sent to API for Vendure gift variant lines + metadata. */
  giftBoxCount?: number
  shippingAmount?: number
  taxAmount?: number
  billing?: AddressFields
  shipping?: AddressFields
  shippingOverridesByUnit?: ShippingOverridesByUnit
  createAccount?: { password: string }
  shippingLabel?: string
}

/** First API response when Stripe Payment Intents flow is used (server creates PI, client confirms). */
export type StripePaymentPending = {
  confirmationNeeded: true
  clientSecret: string
  /** Vendure order code for `/order/[code]` and webhooks. */
  orderCode: string
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
    giftPackagingAmount?: number
    giftLineMessages?: { unitKey: string; message: string }[]
    amountPaid?: number
    taxLines?: { description: string; taxRate: number; taxTotal: number }[]
    lines: {
      productName: string
      variantName: string | null
      quantity: number
      /** Unit price ex. tax (major units). */
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
    }
  }
}

type CartContextValue = {
  cart: Cart | null
  loading: boolean
  updating: boolean
  addItem: (variantId: string, quantity?: number) => Promise<void>
  updateItem: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  clearCart: () => void
  resetCartSession: () => Promise<void>
  /** Refetch active order from Vendure and update cart (e.g. after setting shipping address so tax/shipping are recalculated). */
  refreshCart: () => Promise<void>
  completeCart: (
    options?: CheckoutOptions
  ) => Promise<string | StripePaymentPending | null>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export const VENDURE_ORDER_STORAGE_KEY = "vendure_last_order_v1"
const ORDER_STORAGE_KEY = VENDURE_ORDER_STORAGE_KEY

const buildCart = (
  items: CartItem[],
  totals?: {
    subtotal?: number
    shipping?: number
    total?: number
    subtotalWithTax?: number
    shippingWithTax?: number
  }
): Cart => {
  const subtotal = totals?.subtotal ?? items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )
  const shippingTotal = totals?.shipping ?? 0
  const total = totals?.total ?? subtotal + shippingTotal

  return {
    items,
    subtotal,
    shippingTotal,
    total,
    subtotalWithTax: totals?.subtotalWithTax,
    shippingWithTax: totals?.shippingWithTax
  }
}

const mapCheckoutToCart = (checkout: Awaited<ReturnType<typeof getActiveOrder>>): Cart => {
  if (!checkout) return buildCart([])
  const items = checkout.lines.map((line) => {
    const unitNet =
      line.variant.pricing?.price?.net?.amount ??
      line.variant.pricing?.price?.gross?.amount ??
      0
    return {
      id: line.variant.id,
      lineId: line.id,
      title: `${line.variant.product.name}${
        line.variant.name ? ` - ${line.variant.name}` : ""
      }`,
      quantity: line.quantity,
      unitPrice: unitNet,
      image: line.variant.media?.[0]?.url ?? line.variant.product?.thumbnail?.url ?? null
    }
  })
  return buildCart(items, {
    subtotal: checkout.subtotalPrice?.net?.amount ?? undefined,
    shipping: checkout.shippingPrice?.net?.amount ?? undefined,
    total: checkout.totalPrice?.gross?.amount ?? undefined,
    subtotalWithTax: checkout.subtotalPrice?.gross?.amount ?? undefined,
    shippingWithTax: checkout.shippingPrice?.gross?.amount ?? undefined
  })
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [checkoutId, setCheckoutId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const safetyTimeout = setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setCheckoutId(null)
      setCart(buildCart([]))
      setLoading(false)
    }, 12_000)

    const init = async () => {
      try {
        const checkout = await getActiveOrder()
        if (cancelled) return
        clearTimeout(safetyTimeout)
        if (!checkout || !checkout.lines?.length) {
          setCheckoutId(null)
          setCart(buildCart([]))
        } else {
          setCheckoutId(checkout.id)
          setCart(mapCheckoutToCart(checkout))
        }
      } catch {
        if (cancelled) return
        cancelled = true
        clearTimeout(safetyTimeout)
        setCheckoutId(null)
        setCart(buildCart([]))
      } finally {
        setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
    }
  }, [])

  const addItem = async (variantId: string, quantity = 1) => {
    setUpdating(true)
    try {
      let checkout = null
      if (!checkoutId) {
        checkout = await createCheckout({
          lines: [{ variantId, quantity }]
        })
        setCheckoutId(checkout.id)
      } else {
        checkout = await checkoutLinesAdd(checkoutId, [
          { variantId, quantity }
        ])
      }
      setCart(mapCheckoutToCart(checkout))
    } finally {
      setUpdating(false)
    }
  }

  const updateItem = async (lineId: string, quantity: number) => {
    if (!checkoutId) return
    const qty = Math.max(1, Math.floor(Number(quantity)) || 1)
    setUpdating(true)
    try {
      const checkout = await checkoutLineUpdate(checkoutId, lineId, qty)
      setCart(mapCheckoutToCart(checkout))
    } finally {
      setUpdating(false)
    }
  }

  const removeItem = async (lineId: string) => {
    if (!checkoutId) return
    setUpdating(true)
    try {
      const checkout = await checkoutLineDelete(checkoutId, lineId)
      if (!checkout.lines?.length) {
        setCheckoutId(null)
        setCart(buildCart([]))
      } else {
        setCheckoutId(checkout.id)
        setCart(mapCheckoutToCart(checkout))
      }
    } finally {
      setUpdating(false)
    }
  }

  const refreshCart = useCallback(async () => {
    try {
      const checkout = await getActiveOrder()
      if (!checkout || !checkout.lines?.length) {
        setCheckoutId(null)
        setCart(buildCart([]))
      } else {
        setCheckoutId(checkout.id)
        setCart(mapCheckoutToCart(checkout))
      }
    } catch {
      // Keep current cart on error
    }
  }, [])

  const resetCartSession = useCallback(async () => {
    clearCheckoutDraftFromBrowser()
    setUpdating(true)
    try {
      const latest = await getActiveOrder()
      const lineIds = latest?.lines?.map((l) => l.id) ?? []
      for (const lineId of lineIds) {
        await checkoutLineDelete("", lineId)
      }
    } catch {
      /* still clear local UI */
    } finally {
      setUpdating(false)
    }
    setCheckoutId(null)
    setCart(buildCart([]))
    await refreshCart()
  }, [refreshCart])

  const clearCart = () => {
    const cleared = buildCart([])
    setCart(cleared)
    setCheckoutId(null)
  }

  const completeCart = async (
    options?: CheckoutOptions
  ): Promise<string | StripePaymentPending | null> => {
    if (!cart?.items?.length) return null

    const email = options?.billing?.email?.trim() ?? options?.shipping?.email?.trim()
    const billing = options?.billing
    const shipping = options?.shipping

    if (!email || !billing || !shipping) {
      throw new Error("Email and billing/shipping addresses are required")
    }

    const toCountryCode = (c: string | { code?: string } | undefined): string => {
      if (c == null) return "CA"
      if (typeof c === "string") {
        const s = c.trim()
        return s.length >= 2 ? s.slice(0, 2).toUpperCase() : "CA"
      }
      return (c.code ?? "CA").toString().slice(0, 2).toUpperCase() || "CA"
    }

    try {
      const res = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          checkoutId,
          email,
          ...(options?.giftByLineUnit && Object.keys(options.giftByLineUnit).length > 0
            ? { giftByLineUnit: options.giftByLineUnit }
            : {}),
          ...(typeof options?.giftBoxCount === "number" && options.giftBoxCount > 0
            ? { giftBoxCount: options.giftBoxCount }
            : {}),
          billing: {
            first_name: billing.first_name,
            last_name: billing.last_name,
            address_1: billing.address_1,
            city: billing.city,
            province: billing.province,
            postal_code: billing.postal_code,
            country: toCountryCode(billing.country)
          },
          shipping: {
            first_name: shipping.first_name,
            last_name: shipping.last_name,
            address_1: shipping.address_1,
            city: shipping.city,
            province: shipping.province,
            postal_code: shipping.postal_code,
            country: toCountryCode(shipping.country)
          },
          createAccount: options?.createAccount,
          storefrontShippingAmount: options?.shippingAmount,
          storefrontShippingLabel: options?.shippingLabel
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? `Checkout failed (${res.status})`)
      }

      if (data.confirmationNeeded && data.clientSecret) {
        const orderCode = typeof data.orderCode === "string" ? data.orderCode.trim() : ""
        if (!orderCode) {
          throw new Error("Stripe checkout started but order code was missing. Try again.")
        }
        return {
          confirmationNeeded: true as const,
          clientSecret: data.clientSecret,
          orderCode,
          createdAccount: data.createdAccount === true ? true : undefined,
          orderSummary: data.orderSummary
        }
      }

      const orderToken = data?.orderToken
      if (!orderToken) {
        throw new Error("No order token returned")
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          ORDER_STORAGE_KEY,
          JSON.stringify({
            orderToken,
            orderNumber: data?.orderNumber,
            createdAccount: data?.createdAccount,
            orderSummary: data?.orderSummary,
          })
        )
      }

      clearCart()
      return orderToken
    } catch (err) {
      throw err
    }
  }

  const value = useMemo(
    () => ({
      cart,
      loading,
      updating,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      resetCartSession,
      refreshCart,
      completeCart
    }),
    [cart, loading, updating, refreshCart, resetCartSession]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}
