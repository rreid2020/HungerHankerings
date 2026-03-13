"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react"
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
  subtotal: number
  total: number
  shippingTotal: number
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
  shippingAmount?: number
  taxAmount?: number
  billing?: AddressFields
  shipping?: AddressFields
  shippingOverridesByUnit?: ShippingOverridesByUnit
  createAccount?: { password: string }
  shippingLabel?: string
  /** Stripe payment method id (pm_xxx); required when Stripe is enabled. Guest and logged-in users can both pass this. */
  paymentMethodId?: string
}

type CartContextValue = {
  cart: Cart | null
  loading: boolean
  updating: boolean
  addItem: (variantId: string, quantity?: number) => Promise<void>
  updateItem: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  clearCart: () => void
  /** Refetch active order from Vendure and update cart (e.g. after setting shipping address so tax/shipping are recalculated). */
  refreshCart: () => Promise<void>
  completeCart: (
    options?: CheckoutOptions
  ) => Promise<string | { confirmationNeeded: true; clientSecret: string } | null>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const ORDER_STORAGE_KEY = "vendure_last_order_v1"

const buildCart = (items: CartItem[], totals?: { subtotal?: number; shipping?: number; total?: number }): Cart => {
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
    total
  }
}

const mapCheckoutToCart = (checkout: Awaited<ReturnType<typeof getActiveOrder>>): Cart => {
  if (!checkout) return buildCart([])
  const items = checkout.lines.map((line) => {
    const price = line.variant.pricing?.price?.gross?.amount ?? 0
    return {
      id: line.variant.id,
      lineId: line.id,
      title: `${line.variant.product.name}${
        line.variant.name ? ` - ${line.variant.name}` : ""
      }`,
      quantity: line.quantity,
      unitPrice: price,
      image: line.variant.media?.[0]?.url ?? line.variant.product?.thumbnail?.url ?? null
    }
  })
  return buildCart(items, {
    subtotal: checkout.subtotalPrice?.gross?.amount ?? undefined,
    shipping: checkout.shippingPrice?.gross?.amount ?? undefined,
    total: checkout.totalPrice?.gross?.amount ?? undefined
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
      setCart(mapCheckoutToCart(checkout))
    } finally {
      setUpdating(false)
    }
  }

  const clearCart = () => {
    const cleared = buildCart([])
    setCart(cleared)
    setCheckoutId(null)
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

  const completeCart = async (
    options?: CheckoutOptions
  ): Promise<string | { confirmationNeeded: true; clientSecret: string } | null> => {
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
          storefrontShippingLabel: options?.shippingLabel,
          paymentMethodId: options?.paymentMethodId
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? `Checkout failed (${res.status})`)
      }

      if (data.confirmationNeeded && data.clientSecret) {
        return { confirmationNeeded: true as const, clientSecret: data.clientSecret }
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
            createdAccount: data?.createdAccount
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
      refreshCart,
      completeCart
    }),
    [cart, loading, updating, refreshCart]
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
