"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import Button from "../../components/Button"
import { AddressAutocomplete } from "../../components/AddressAutocomplete"
import { useCart } from "../../components/CartContext"
import type { AddressFields, ShippingOverridesByUnit } from "../../components/CartContext"
import { useAuth } from "../../components/AuthContext"
import { useGooglePlacesScript } from "../../hooks/useGooglePlacesScript"
import { getTaxRate, CANADIAN_PROVINCES } from "../../lib/shippingTax"
import {
  checkoutShippingAddressUpdate,
  getCheckoutShippingMethods,
  checkoutDeliveryMethodUpdate,
  getShippingQuoteDollars
} from "../../lib/vendure"
import Link from "next/link"
import Image from "next/image"
import Script from "next/script"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"

const GIFT_BOX_FEE = 3.99
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const CHECKOUT_DRAFT_KEY = "hungerhankerings_checkout_draft_v1"

/** Fallback when Vendure countries are not yet loaded or API fails */
const emptyAddress: AddressFields = {
  first_name: "",
  last_name: "",
  email: "",
  address_1: "",
  city: "",
  province: "",
  postal_code: "",
  country: "CA"
}

const inputClass =
  "rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

const CheckoutPage = () => {
  const { cart, loading, updating, completeCart, updateItem, removeItem, refreshCart } = useCart()
  const { user, login: authLogin } = useAuth()
  const router = useRouter()
  const isLoggedIn = !!user
  const [processing, setProcessing] = useState(false)
  const [showCheckoutLogin, setShowCheckoutLogin] = useState(false)
  const [checkoutLoginPassword, setCheckoutLoginPassword] = useState("")
  const [checkoutLoginError, setCheckoutLoginError] = useState<string | null>(null)
  const [checkoutLoginSubmitting, setCheckoutLoginSubmitting] = useState(false)
  const [billing, setBilling] = useState<AddressFields>(emptyAddress)
  const [shipping, setShipping] = useState<AddressFields>(emptyAddress)
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([])
  const [giftByLineUnit, setGiftByLineUnit] = useState<
    Record<string, { enabled: boolean; message: string }>
  >({})
  type Assignment = { main: Record<string, number>; custom: Record<string, number>[] }
  const [customAddresses, setCustomAddresses] = useState<AddressFields[]>([])
  const [assignment, setAssignment] = useState<Assignment>({ main: {}, custom: [] })
  type PaymentMethod = "credit_card" | "paypal" | "google_pay" | "apple_pay" | "shop_pay"
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card")
  const [cardNumber, setCardNumber] = useState("")
  const [nameOnCard, setNameOnCard] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [applePayReady, setApplePayReady] = useState(false)
  const applePayButtonRef = useRef<HTMLDivElement>(null)
  const draftSavedOnce = useRef(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [createAccount, setCreateAccount] = useState(false)
  const [createAccountPassword, setCreateAccountPassword] = useState("")
  const stripeRef = useRef<Awaited<ReturnType<typeof loadStripe>>>(null)
  const cardElementRef = useRef<{ mount: (el: HTMLElement) => void } | null>(null)
  const cardMountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY || !cardMountRef.current) return
    let mounted = true
    loadStripe(STRIPE_PUBLISHABLE_KEY).then((stripe) => {
      if (!mounted || !stripe || !cardMountRef.current) return
      stripeRef.current = stripe
      const elements = stripe.elements()
      const card = elements.create("card", { style: { base: { fontSize: "16px" } } })
      card.mount(cardMountRef.current)
      cardElementRef.current = card
    })
    return () => {
      mounted = false
      cardElementRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!applePayReady || !applePayButtonRef.current) return
    const mount = () => {
      if (!applePayButtonRef.current) return
      const el = document.createElement("apple-pay-button")
      el.setAttribute("buttonstyle", "black")
      el.setAttribute("type", "plain")
      el.setAttribute("locale", "en")
      el.addEventListener("click", () => setPaymentMethod("apple_pay"))
      applePayButtonRef.current.innerHTML = ""
      applePayButtonRef.current.appendChild(el)
    }
    if (typeof customElements !== "undefined" && customElements.get("apple-pay-button")) {
      mount()
    } else if (typeof customElements !== "undefined") {
      customElements.whenDefined("apple-pay-button").then(mount)
    }
  }, [applePayReady])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        billing?: Partial<AddressFields>
        shipping?: Partial<AddressFields>
        giftByLineUnit?: Record<string, { enabled: boolean; message: string }>
        customAddresses?: AddressFields[]
        assignment?: Assignment
      }
      if (!draft || typeof draft !== "object") return
      if (draft.billing && typeof draft.billing === "object") {
        setBilling((prev) => ({ ...emptyAddress, ...prev, ...draft.billing }))
      }
      if (draft.shipping && typeof draft.shipping === "object") {
        setShipping((prev) => ({ ...emptyAddress, ...prev, ...draft.shipping }))
      }
      if (draft.giftByLineUnit && typeof draft.giftByLineUnit === "object") {
        // Only restore gift where both enabled and non-empty message (avoid charging when not selected)
        const normalized: Record<string, { enabled: boolean; message: string }> = {}
        for (const [k, v] of Object.entries(draft.giftByLineUnit)) {
          if (v && typeof v.enabled === "boolean" && typeof v.message === "string") {
            const hasMessage = v.message.trim().length > 0
            normalized[k] = { enabled: v.enabled && hasMessage, message: v.message }
          }
        }
        setGiftByLineUnit(normalized)
      }
      if (Array.isArray(draft.customAddresses)) {
        setCustomAddresses(
          draft.customAddresses.map((a) => ({ ...emptyAddress, ...a }))
        )
      }
      if (
        draft.assignment &&
        typeof draft.assignment === "object" &&
        Array.isArray(draft.assignment.custom)
      ) {
        setAssignment({
          main: { ...(draft.assignment.main || {}) },
          custom: draft.assignment.custom.map((c: Record<string, number>) => ({ ...c }))
        })
      }
    } catch {
      /* ignore */
    }
  }, [])

  // Load countries from Vendure (zones) for country dropdowns; only Vendure-configured countries are shown
  useEffect(() => {
    fetch("/api/countries", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: { code: string; name: string }[]) => {
        if (Array.isArray(list)) setCountries(list)
      })
      .catch(() => setCountries([]))
  }, [])

  // Pre-fill billing and shipping from logged-in user's default addresses (only when form is still empty so draft wins)
  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false
    fetch("/api/checkout/addresses")
      .then((res) => res.json())
      .then((data: { email?: string | null; billing?: AddressFields | null; shipping?: AddressFields | null }) => {
        if (cancelled) return
        if (!data?.email) return
        setBilling((prev) => {
          const b = data.billing
          if (!b) return prev.email ? prev : { ...prev, email: data.email ?? "" }
          // Only skip pre-fill when billing address was already filled (draft or user), not when only email was set
          if (prev.first_name?.trim() || prev.address_1?.trim()) return prev
          return { ...emptyAddress, ...b, email: data.email ?? b.email }
        })
        setShipping((prev) => {
          if (prev.first_name?.trim() || prev.address_1?.trim()) return prev
          const s = data.shipping
          if (!s) return prev
          return { ...emptyAddress, ...s, email: data.email ?? s.email }
        })
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!draftSavedOnce.current) {
      draftSavedOnce.current = true
      return
    }
    try {
      window.localStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({
          billing,
          shipping,
          giftByLineUnit,
          customAddresses,
          assignment
        })
      )
    } catch {
      /* ignore */
    }
  }, [billing, shipping, giftByLineUnit, customAddresses, assignment])

  // Sync main shipping address to Vendure so tax/shipping are calculated by province; then refetch cart
  const syncAddressToVendureRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const country = shipping.country?.trim().toUpperCase().slice(0, 2)
    const province = shipping.province?.trim()
    if (!country || !province || !cart?.items?.length) return

    if (syncAddressToVendureRef.current) clearTimeout(syncAddressToVendureRef.current)
    syncAddressToVendureRef.current = setTimeout(async () => {
      syncAddressToVendureRef.current = null
      try {
        await checkoutShippingAddressUpdate("", {
          firstName: shipping.first_name?.trim() || "Guest",
          lastName: shipping.last_name?.trim() || "Guest",
          streetAddress1: shipping.address_1?.trim() ?? "",
          streetAddress2: null,
          city: shipping.city?.trim() ?? "",
          postalCode: shipping.postal_code?.trim() ?? "",
          country,
          countryArea: province || null,
          phone: null
        })
        const methods = await getCheckoutShippingMethods("")
        if (methods[0]) {
          await checkoutDeliveryMethodUpdate("", methods[0].id)
        }
        await refreshCart()
      } catch (err) {
        const msg = err instanceof Error ? err.message : ""
        if (!msg.includes("doesn't need shipping")) {
          // Log but don't block; user can still complete and API will set address then
        }
      }
    }, 800)
    return () => {
      if (syncAddressToVendureRef.current) clearTimeout(syncAddressToVendureRef.current)
    }
  }, [
    shipping.country,
    shipping.province,
    shipping.first_name,
    shipping.last_name,
    shipping.address_1,
    shipping.city,
    shipping.postal_code,
    cart?.items?.length,
    refreshCart
  ])

  const copyBillingToShipping = useCallback(() => {
    const get = (id: string) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null
      return el?.value ?? ""
    }
    setShipping({
      first_name: get("checkout-billing-first"),
      last_name: get("checkout-billing-last"),
      email: get("checkout-email"),
      address_1: get("checkout-billing-address"),
      city: get("checkout-billing-city"),
      province: get("checkout-billing-province"),
      postal_code: get("checkout-billing-postal"),
      country: get("checkout-billing-country") || "CA"
    })
  }, [])

  const giftUnits = useMemo(() => {
    const out: Record<string, { giftMessage: string }> = {}
    for (const [key, { enabled, message }] of Object.entries(giftByLineUnit)) {
      if (enabled && message.trim()) out[key] = { giftMessage: message.trim() }
    }
    return out
  }, [giftByLineUnit])

  const giftCount = Object.keys(giftUnits).length
  const giftFee = giftCount * GIFT_BOX_FEE

  const unitKey = (lineId: string, unitIndex: number) => `${lineId}-${unitIndex}`

  useEffect(() => {
    const items = cart?.items ?? []
    if (items.length === 0) return
    setAssignment((prev) => {
      const main = { ...prev.main }
      const custom = prev.custom.map((c) => ({ ...c }))
      let changed = false
      for (const item of items) {
        const total = item.quantity
        const customSum = custom.reduce((s, c) => s + (c[item.lineId] ?? 0), 0)
        let mainQty = main[item.lineId] ?? 0
        if (mainQty + customSum !== total) {
          changed = true
          mainQty = Math.max(0, Math.min(total - customSum, total))
          main[item.lineId] = mainQty
          for (let i = 0; i < custom.length; i++) {
            if (custom[i][item.lineId] == null) custom[i][item.lineId] = 0
          }
        }
      }
      for (const k of Object.keys(main)) {
        if (!items.some((i) => i.lineId === k)) {
          changed = true
          delete main[k]
          for (const c of custom) delete c[k]
        }
      }
      return changed ? { main, custom } : prev
    })
  }, [cart?.items])

  const setAssignmentCustom = useCallback((customIndex: number, lineId: string, qty: number) => {
    const total = cart?.items?.find((i) => i.lineId === lineId)?.quantity ?? 0
    const otherCustomSum = assignment.custom.reduce(
      (s, c, i) => (i === customIndex ? s : s + (c[lineId] ?? 0)),
      0
    )
    const v = Math.max(0, Math.min(qty, total - otherCustomSum))
    setAssignment((prev) => {
      const nextCustom = prev.custom.map((c, i) =>
        i === customIndex ? { ...c, [lineId]: v } : c
      )
      const main = { ...prev.main }
      for (const item of cart?.items ?? []) {
        const t = item.quantity
        const customSum = nextCustom.reduce((s, c) => s + (c[item.lineId] ?? 0), 0)
        main[item.lineId] = Math.max(0, t - customSum)
      }
      return { main, custom: nextCustom }
    })
  }, [cart?.items, assignment.custom])

  const addCustomAddress = useCallback(() => {
    setCustomAddresses((prev) => [...prev, { ...emptyAddress }])
    setAssignment((prev) => ({
      ...prev,
      custom: [
        ...prev.custom,
        Object.fromEntries((cart?.items ?? []).map((i) => [i.lineId, 0]))
      ]
    }))
  }, [cart?.items])

  const removeCustomAddress = useCallback((index: number) => {
    setCustomAddresses((prev) => prev.filter((_, i) => i !== index))
    setAssignment((prev) => ({
      main: { ...prev.main, ...Object.fromEntries((cart?.items ?? []).map((i) => [i.lineId, (prev.main[i.lineId] ?? 0) + (prev.custom[index]?.[i.lineId] ?? 0)])) },
      custom: prev.custom.filter((_, i) => i !== index)
    }))
  }, [cart?.items])

  const setCustomAddressAt = useCallback((index: number, update: Partial<AddressFields>) => {
    setCustomAddresses((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...update } : a))
    )
  }, [])

  const shippingOverridesByUnit = useMemo((): ShippingOverridesByUnit => {
    const items = cart?.items ?? []
    const result: ShippingOverridesByUnit = {}
    for (const item of items) {
      const { lineId } = item
      const qMain = assignment.main[lineId] ?? 0
      let unitIndex = 0
      for (let i = 0; i < qMain && unitIndex < item.quantity; i++, unitIndex++) {
        result[unitKey(lineId, unitIndex)] = null
      }
      for (let c = 0; c < assignment.custom.length; c++) {
        const q = assignment.custom[c][lineId] ?? 0
        const addr = customAddresses[c]
        for (let i = 0; i < q && unitIndex < item.quantity; i++, unitIndex++) {
          result[unitKey(lineId, unitIndex)] = addr ?? null
        }
      }
      while (unitIndex < item.quantity) {
        result[unitKey(lineId, unitIndex)] = null
        unitIndex++
      }
    }
    return result
  }, [cart?.items, assignment, customAddresses])

  /** Distinct addresses for shipping quote; used to fetch Vendure postal-zone rates. */
  const addressKeysForShipping = useMemo(() => {
    if (!cart?.items?.length) return []
    const items = cart.items
    const destKey = (d: AddressFields) =>
      [
        (d.country || "").trim().toUpperCase().slice(0, 2),
        (d.province || "").trim(),
        (d.postal_code || "").trim(),
        (d.address_1 || "").trim(),
        (d.city || "").trim()
      ].join("|")
    type Unit = { lineId: string; unitIndex: number }
    const units: Unit[] = []
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        units.push({ lineId: item.lineId, unitIndex: i })
      }
    }
    const getDest = (u: Unit) => {
      const override = shippingOverridesByUnit[unitKey(u.lineId, u.unitIndex)]
      if (override == null) return shipping
      const c = (override.country || "").trim()
      const p = (override.province || "").trim()
      if (!c || !p) return shipping
      return override
    }
    const keys = new Map<string, { country: string; postal_code: string }>()
    for (const u of units) {
      const d = getDest(u)
      const c = (d.country || "").trim()
      const p = (d.province || "").trim()
      if (!c || !p) continue
      const key = destKey(d)
      if (!keys.has(key)) keys.set(key, { country: c, postal_code: (d.postal_code || "").trim() })
    }
    return Array.from(keys.entries()).map(([destKey, addr]) => ({ destKey, ...addr }))
  }, [cart?.items, shipping, shippingOverridesByUnit])

  const [shippingByDestKey, setShippingByDestKey] = useState<Record<string, number>>({})

  useEffect(() => {
    if (addressKeysForShipping.length === 0) {
      setShippingByDestKey({})
      return
    }
    let cancelled = false
    Promise.all(
      addressKeysForShipping.map(async ({ destKey, country, postal_code }) => {
        const dollars = await getShippingQuoteDollars(country, postal_code)
        return { destKey, dollars }
      })
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, number> = {}
      for (const { destKey, dollars } of results) next[destKey] = dollars
      setShippingByDestKey(next)
    })
    return () => { cancelled = true }
  }, [addressKeysForShipping])

  const { shippingAmount, taxAmount, orderTotal, addressBreakdown } =
    useMemo(() => {
      type LineItem = {
        lineId: string
        title: string
        quantity: number
        unitPrice: number
        lineTotal: number
      }
      type AddrRow = {
        label: string
        provinceLabel: string
        boxCount: number
        lineItems: LineItem[]
        subtotal: number
        shipping: number
        giftCount: number
        giftFee: number
        taxRate: number
        taxAmount: number
        totalForAddress: number
        costPerBox: number
      }
      if (!cart?.items?.length) {
        return {
          shippingAmount: 0,
          taxAmount: 0,
          orderTotal: cart?.subtotal ?? 0,
          addressBreakdown: [] as AddrRow[]
        }
      }
      const items = cart.items
      /** Group by full address so each distinct shipping address gets its own shipping charge */
      const destKey = (d: AddressFields) =>
        [
          (d.country || "").trim().toUpperCase().slice(0, 2),
          (d.province || "").trim(),
          (d.postal_code || "").trim(),
          (d.address_1 || "").trim(),
          (d.city || "").trim()
        ].join("|")
      type Unit = { lineId: string; unitIndex: number; unitPrice: number; gift: boolean }
      const units: Unit[] = []
      for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
          const key = unitKey(item.lineId, i)
          const g = giftByLineUnit[key]
          units.push({
            lineId: item.lineId,
            unitIndex: i,
            unitPrice: item.unitPrice,
            gift: !!(g?.enabled && g?.message?.trim())
          })
        }
      }
      const getDest = (u: Unit) => {
        const override = shippingOverridesByUnit[unitKey(u.lineId, u.unitIndex)]
        if (override == null) return shipping
        const c = (override.country || "").trim()
        const p = (override.province || "").trim()
        if (!c || !p) return shipping
        return override
      }
      type Group = {
        country: string
        province: string
        address_1: string
        city: string
        postal_code: string
        units: Unit[]
        subtotal: number
        giftCount: number
      }
      const groups = new Map<string, Group>()
      for (const u of units) {
        const d = getDest(u)
        const c = (d.country || "").trim()
        const p = (d.province || "").trim()
        const addr = (d.address_1 || "").trim()
        const city = (d.city || "").trim()
        const postal = (d.postal_code || "").trim()
        if (!c || !p) continue
        const key = destKey(d)
        const existing = groups.get(key)
        if (!existing) {
          groups.set(key, {
            country: c,
            province: p,
            address_1: addr,
            city,
            postal_code: postal,
            units: [u],
            subtotal: u.unitPrice,
            giftCount: u.gift ? 1 : 0
          })
        } else {
          existing.units.push(u)
          existing.subtotal += u.unitPrice
          if (u.gift) existing.giftCount += 1
        }
      }
      let totalShipping = 0
      let totalTax = 0
      const provinceLabel = (country: string, province: string) => {
        const cc = country.toUpperCase().slice(0, 2)
        if (cc === "CA") {
          const found = CANADIAN_PROVINCES.find((x) => x.code === province)
          return found ? found.name : province
        }
        return province
      }
      const shippingLabel = (g: Group) => {
        const prov = provinceLabel(g.country, g.province)
        if (g.address_1 && g.city) return `${prov} — ${g.address_1}, ${g.city}`
        return prov
      }
      type AddressBreakdownItem = {
        label: string
        provinceLabel: string
        boxCount: number
        lineItems: LineItem[]
        subtotal: number
        shipping: number
        giftCount: number
        giftFee: number
        taxRate: number
        taxAmount: number
        totalForAddress: number
        costPerBox: number
      }
      const addressBreakdown: AddressBreakdownItem[] = []
      for (const [destKey, g] of groups) {
        const ship = shippingByDestKey[destKey] ?? 0
        const giftFeeGroup = g.giftCount * GIFT_BOX_FEE
        const taxable = g.subtotal + ship + giftFeeGroup
        const rate = getTaxRate(g.country, g.province)
        const tax = taxable * rate
        totalShipping += ship
        totalTax += tax
        const boxCount = g.units.length
        const totalForAddress = g.subtotal + ship + giftFeeGroup + tax
        const provLabel = provinceLabel(g.country, g.province)
        const lineItemsByLineId = new Map<string, { count: number; unitPrice: number }>()
        for (const u of g.units) {
          const existing = lineItemsByLineId.get(u.lineId)
          if (!existing) {
            lineItemsByLineId.set(u.lineId, { count: 1, unitPrice: u.unitPrice })
          } else {
            existing.count += 1
          }
        }
        const lineItems: LineItem[] = Array.from(lineItemsByLineId.entries()).map(
          ([lineId, { count, unitPrice }]) => ({
            lineId,
            title: items.find((i) => i.lineId === lineId)?.title ?? "Box",
            quantity: count,
            unitPrice,
            lineTotal: unitPrice * count
          })
        )
        addressBreakdown.push({
          label: shippingLabel(g),
          provinceLabel: provLabel,
          boxCount,
          lineItems,
          subtotal: g.subtotal,
          shipping: ship,
          giftCount: g.giftCount,
          giftFee: giftFeeGroup,
          taxRate: rate,
          taxAmount: tax,
          totalForAddress,
          costPerBox: boxCount > 0 ? totalForAddress / boxCount : 0
        })
      }
      const orderTotal =
        (cart?.subtotal ?? 0) + totalShipping + giftFee + totalTax
      return {
        shippingAmount: totalShipping,
        taxAmount: totalTax,
        orderTotal,
        addressBreakdown
      }
    }, [
      cart?.items,
      cart?.subtotal,
      shipping,
      shippingOverridesByUnit,
      giftByLineUnit,
      giftFee,
      shippingByDestKey
    ])

  // Prefer Vendure totals when we have a single address and no gift (Vendure doesn't know about gift fee)
  const hasShippingAddress = !!(shipping.country?.trim() && shipping.province?.trim())
  const useStoreTotals = giftFee > 0 || addressBreakdown.length > 1
  const useVendureTotals =
    hasShippingAddress && cart?.total != null && cart.total > 0 && !useStoreTotals
  const displayShipping = useVendureTotals ? (cart?.shippingTotal ?? 0) : shippingAmount
  const displayTax = useVendureTotals
    ? Math.max(0, (cart?.total ?? 0) - (cart?.subtotal ?? 0) - (cart?.shippingTotal ?? 0))
    : taxAmount
  const displayOrderTotal = useVendureTotals ? (cart?.total ?? 0) : orderTotal

  const { isLoaded: placesLoaded } = useGooglePlacesScript()

  const keyToBoxLabel = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of cart?.items ?? []) {
      for (let i = 0; i < item.quantity; i++) {
        const k = unitKey(item.lineId, i)
        map[k] = `${item.title} — Box ${i + 1} of ${item.quantity}`
      }
    }
    return map
  }, [cart?.items])

  const getUnitDestinationLabel = useCallback(
    (lineId: string, unitIndex: number): string => {
      const item = cart?.items?.find((i) => i.lineId === lineId)
      if (!item) return "Main address"
      const qMain = assignment.main[lineId] ?? 0
      let idx = 0
      if (unitIndex < qMain) return "Main address"
      idx = qMain
      for (let c = 0; c < assignment.custom.length; c++) {
        const q = assignment.custom[c][lineId] ?? 0
        if (unitIndex < idx + q) {
          const addr = customAddresses[c]
          const short = [addr?.address_1, addr?.city, addr?.province].filter(Boolean).join(", ")
          return short ? `Custom — ${short}` : `Custom address ${c + 1}`
        }
        idx += q
      }
      return "Main address"
    },
    [cart?.items, assignment, customAddresses]
  )

  type UnitInfo = { key: string; lineId: string; unitIndex: number; boxLabel: string }
  const unitsByDestination = useMemo(() => {
    const main: UnitInfo[] = []
    const custom: UnitInfo[][] = assignment.custom.map(() => [])
    for (const item of cart?.items ?? []) {
      const { lineId } = item
      const qMain = assignment.main[lineId] ?? 0
      let unitIndex = 0
      for (let i = 0; i < qMain && unitIndex < item.quantity; i++, unitIndex++) {
        main.push({ key: unitKey(lineId, unitIndex), lineId, unitIndex, boxLabel: keyToBoxLabel[unitKey(lineId, unitIndex)] ?? item.title })
      }
      for (let c = 0; c < assignment.custom.length; c++) {
        const q = assignment.custom[c][lineId] ?? 0
        for (let i = 0; i < q && unitIndex < item.quantity; i++, unitIndex++) {
          custom[c].push({ key: unitKey(lineId, unitIndex), lineId, unitIndex, boxLabel: keyToBoxLabel[unitKey(lineId, unitIndex)] ?? item.title })
        }
      }
    }
    return { main, custom }
  }, [cart?.items, assignment, keyToBoxLabel])

  const allocationErrors = useMemo(() => {
    const errs: { title: string; allocated: number; total: number }[] = []
    for (const item of cart?.items ?? []) {
      const mainQty = assignment.main[item.lineId] ?? 0
      const customSum = assignment.custom.reduce((s, c) => s + (c[item.lineId] ?? 0), 0)
      const allocated = mainQty + customSum
      if (allocated !== item.quantity) {
        errs.push({ title: item.title, allocated, total: item.quantity })
      }
    }
    return errs
  }, [cart?.items, assignment])

  const setGiftForUnit = (
    lineId: string,
    unitIndex: number,
    enabled: boolean,
    message: string
  ) => {
    setGiftByLineUnit((prev) => ({
      ...prev,
      [unitKey(lineId, unitIndex)]: { enabled, message }
    }))
  }

  if (loading) {
    return <div className="container-page py-12">Loading checkout...</div>
  }

  if (!cart) {
    return <div className="container-page py-12">Cart not found.</div>
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
        <p className="mt-2 text-sm text-foreground">
          Your cart is empty. Add a snack box to continue.
        </p>
        <div className="mt-6">
          <Button href="/themed-snack-boxes">Browse Snack Boxes</Button>
        </div>
      </div>
    )
  }

  const isAddressComplete = (a: AddressFields) =>
    !!(a.first_name?.trim() && a.last_name?.trim() && a.address_1?.trim() &&
      a.city?.trim() && a.province?.trim() && a.postal_code?.trim() && a.country?.trim())

  const isValid = () => {
    const hasBilling =
      billing.first_name?.trim() &&
      billing.last_name?.trim() &&
      billing.email?.trim() &&
      billing.address_1?.trim() &&
      billing.city?.trim() &&
      billing.province?.trim() &&
      billing.postal_code?.trim() &&
      billing.country?.trim()
    if (!hasBilling) return false
    const hasShipping = isAddressComplete(shipping)
    if (!hasShipping) return false
    for (let i = 0; i < customAddresses.length; i++) {
      const q = assignment.custom[i]
      const hasBoxes = q && Object.values(q).some((n) => n > 0)
      if (hasBoxes && !isAddressComplete(customAddresses[i])) return false
    }
    for (const item of cart.items) {
      const mainQty = assignment.main[item.lineId] ?? 0
      const customSum = assignment.custom.reduce((s, c) => s + (c[item.lineId] ?? 0), 0)
      if (mainQty + customSum !== item.quantity) return false
    }
    for (const [, { enabled, message }] of Object.entries(giftByLineUnit)) {
      if (enabled && !message.trim()) return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart || processing || !isValid()) return
    if (createAccount && createAccountPassword.trim().length < 8) {
      setCheckoutError("Password must be at least 8 characters to create an account.")
      return
    }
    setCheckoutError(null)
    setProcessing(true)
    const customOnly: ShippingOverridesByUnit = {}
    for (const [key, addr] of Object.entries(shippingOverridesByUnit)) {
      if (addr != null && isAddressComplete(addr)) customOnly[key] = addr
    }
    try {
      const shippingLabel =
        shipping.country === "CA"
          ? CANADIAN_PROVINCES.find((p) => p.code === shipping.province)?.name ?? shipping.province
          : shipping.country === "US"
            ? "United States"
            : "International"
      const options = {
        giftByLineUnit: giftCount ? giftUnits : undefined,
        giftFee: giftCount ? giftFee : undefined,
        shippingAmount: displayShipping,
        taxAmount: displayTax,
        billing,
        shipping,
        shippingOverridesByUnit: Object.keys(customOnly).length ? customOnly : undefined,
        shippingLabel,
        createAccount:
          createAccount && createAccountPassword.trim().length >= 8
            ? { password: createAccountPassword.trim() }
            : undefined
      }
      let paymentMethodId: string | undefined
      if (STRIPE_PUBLISHABLE_KEY && stripeRef.current && cardElementRef.current) {
        const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
          type: "card",
          card: cardElementRef.current as any
        })
        if (error) throw new Error(error.message ?? "Payment method failed")
        if (paymentMethod?.id) paymentMethodId = paymentMethod.id
      }
      let result = await completeCart({
        ...options,
        paymentMethodId
      })
      if (result && typeof result === "object" && "confirmationNeeded" in result && result.confirmationNeeded && result.clientSecret && stripeRef.current) {
        const { error } = await stripeRef.current.confirmCardPayment(result.clientSecret)
        if (error) throw new Error(error.message ?? "Payment confirmation failed")
        result = await completeCart({ ...options, paymentMethodId })
      }
      if (result && typeof result === "string") {
        try {
          window.localStorage.removeItem(CHECKOUT_DRAFT_KEY)
        } catch {
          /* ignore */
        }
        router.push(`/order/${result}`)
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-10">
        <form id="checkout-form" className="space-y-10" onSubmit={handleSubmit}>
          <section>
            <h2 className="text-base font-semibold text-foreground">Contact information</h2>
            <div className="mt-4 space-y-4">
              <input
                id="checkout-email"
                className={inputClass + " w-full"}
                type="email"
                placeholder="Email address"
                required
                value={billing.email}
                onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
              />
              {!isLoggedIn && !showCheckoutLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutLogin(true)
                    setCheckoutLoginError(null)
                    setCheckoutLoginPassword("")
                  }}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Already have an account? Log in
                </button>
              )}
              {!isLoggedIn && showCheckoutLogin && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Log in to use your saved addresses</p>
                  <p className="text-xs text-muted-foreground">Using the email above. Change it there if you need to.</p>
                  <div>
                    <label htmlFor="checkout-login-password" className="block text-sm font-medium text-foreground mb-1">
                      Password
                    </label>
                    <input
                      id="checkout-login-password"
                      type="password"
                      className={inputClass + " w-full"}
                      placeholder="Your password"
                      autoComplete="current-password"
                      value={checkoutLoginPassword}
                      onChange={(e) => {
                        setCheckoutLoginPassword(e.target.value)
                        setCheckoutLoginError(null)
                      }}
                    />
                  </div>
                  {checkoutLoginError && (
                    <p className="text-sm text-red-600" role="alert">{checkoutLoginError}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={checkoutLoginSubmitting}
                      onClick={async () => {
                        const email = billing.email?.trim()
                        if (!email || !checkoutLoginPassword) {
                          setCheckoutLoginError("Enter your password.")
                          return
                        }
                        setCheckoutLoginError(null)
                        setCheckoutLoginSubmitting(true)
                        try {
                          await authLogin(email, checkoutLoginPassword)
                          const res = await fetch("/api/checkout/addresses", { credentials: "include" })
                          const data = await res.json().catch(() => ({}))
                          if (data?.email && data?.billing) {
                            setBilling((prev) => ({ ...emptyAddress, ...data.billing, email: data.email }))
                          }
                          if (data?.shipping) {
                            setShipping((prev) => ({ ...emptyAddress, ...data.shipping, email: data.email }))
                          }
                          setShowCheckoutLogin(false)
                          setCheckoutLoginPassword("")
                        } catch (err) {
                          setCheckoutLoginError(err instanceof Error ? err.message : "Login failed. Please try again.")
                        } finally {
                          setCheckoutLoginSubmitting(false)
                        }
                      }}
                      className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
                    >
                      {checkoutLoginSubmitting ? "Logging in…" : "Log in"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckoutLogin(false)
                        setCheckoutLoginPassword("")
                        setCheckoutLoginError(null)
                      }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {!isLoggedIn && !showCheckoutLogin && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAccount}
                      onChange={(e) => {
                        setCreateAccount(e.target.checked)
                        if (!e.target.checked) setCreateAccountPassword("")
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">Create an account (use this email and a password to sign in later)</span>
                  </label>
                  {createAccount && (
                    <div>
                      <label htmlFor="checkout-create-password" className="block text-sm font-medium text-foreground mb-1">
                        Password (min 8 characters)
                      </label>
                      <input
                        id="checkout-create-password"
                        className={inputClass + " w-full"}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Choose a password"
                        minLength={8}
                        value={createAccountPassword}
                        onChange={(e) => setCreateAccountPassword(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {checkoutError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {checkoutError}
            </div>
          )}

          <section>
            <h2 className="text-base font-semibold text-foreground">Billing address</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                id="checkout-billing-first"
                className={inputClass}
                placeholder="First name"
                required
                value={billing.first_name}
                onChange={(e) => setBilling((b) => ({ ...b, first_name: e.target.value }))}
              />
              <input
                id="checkout-billing-last"
                className={inputClass}
                placeholder="Last name"
                required
                value={billing.last_name}
                onChange={(e) => setBilling((b) => ({ ...b, last_name: e.target.value }))}
              />
              {placesLoaded ? (
                <AddressAutocomplete
                  id="checkout-billing-address"
                  placesReady={placesLoaded}
                  className={inputClass + " md:col-span-2"}
                  placeholder="Address"
                  required
                  value={billing.address_1}
                  onChange={(v) => setBilling((b) => ({ ...b, address_1: v }))}
                  onAddressSelect={(addr) =>
                    setBilling((b) => ({
                      ...b,
                      address_1: addr.address_1,
                      city: addr.city,
                      province: addr.province,
                      postal_code: addr.postal_code,
                      country: addr.country
                    }))
                  }
                />
              ) : (
                <input
                  id="checkout-billing-address"
                  className={inputClass + " md:col-span-2"}
                  placeholder="Address"
                  required
                  value={billing.address_1}
                  onChange={(e) => setBilling((b) => ({ ...b, address_1: e.target.value }))}
                />
              )}
              <input
                id="checkout-billing-city"
                className={inputClass}
                placeholder="City"
                required
                value={billing.city}
                onChange={(e) => setBilling((b) => ({ ...b, city: e.target.value }))}
              />
              {billing.country === "CA" ? (
                <div>
                  <label htmlFor="checkout-billing-province" className="sr-only">
                    Province
                  </label>
                  <select
                    id="checkout-billing-province"
                    required
                    value={billing.province}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, province: e.target.value }))
                    }
                    className={inputClass + " w-full"}
                  >
                    <option value="">Province</option>
                    {CANADIAN_PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  id="checkout-billing-province"
                  className={inputClass}
                  placeholder="State / Province"
                  required
                  value={billing.province}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, province: e.target.value }))
                  }
                />
              )}
              <input
                id="checkout-billing-postal"
                className={inputClass}
                placeholder="Postal code"
                required
                value={billing.postal_code}
                onChange={(e) => setBilling((b) => ({ ...b, postal_code: e.target.value }))}
              />
              <div className="md:col-span-2">
                <label htmlFor="checkout-billing-country" className="sr-only">
                  Country
                </label>
                <select
                  id="checkout-billing-country"
                  required
                  value={billing.country}
                  onChange={(e) => setBilling((b) => ({ ...b, country: e.target.value }))}
                  className={inputClass + " w-full"}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-white/20 bg-footer p-4 text-white">
            <h2 className="text-base font-semibold text-white">Shipping information</h2>
            <p className="mt-1 text-sm text-white/90">
              Assign boxes to each address and add gift wrap or a gift card ($3.99 per box) for any box. Shipping and tax are charged per destination.
            </p>
            {allocationErrors.length > 0 && (
              <div className="mt-4 rounded-md border border-white/30 bg-white/10 p-4 text-sm text-white" role="alert">
                <p className="font-medium">Please assign all boxes to an address.</p>
                <ul className="mt-2 list-inside list-disc">
                  {allocationErrors.map((e) => (
                    <li key={e.title}>
                      {e.title}: {e.allocated} of {e.total} allocated. Assign {e.total - e.allocated} more to an address.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 space-y-4">
              {/* Main shipping address card - same layout as custom */}
              <div className="rounded-lg border border-gray-300 bg-white p-4 text-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Main shipping address</span>
                  <button
                    type="button"
                    onClick={copyBillingToShipping}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    Same as billing address
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input className={inputClass} placeholder="First name" required value={shipping.first_name} onChange={(e) => setShipping((s) => ({ ...s, first_name: e.target.value }))} />
                  <input className={inputClass} placeholder="Last name" required value={shipping.last_name} onChange={(e) => setShipping((s) => ({ ...s, last_name: e.target.value }))} />
                  {placesLoaded ? (
                    <AddressAutocomplete
                      placesReady={placesLoaded}
                      className={inputClass + " md:col-span-2"}
                      placeholder="Address"
                      required
                      value={shipping.address_1}
                      onChange={(v) => setShipping((s) => ({ ...s, address_1: v }))}
                      onAddressSelect={(addr) => setShipping((s) => ({ ...s, address_1: addr.address_1, city: addr.city, province: addr.province, postal_code: addr.postal_code, country: addr.country }))}
                    />
                  ) : (
                    <input className={inputClass + " md:col-span-2"} placeholder="Address" required value={shipping.address_1} onChange={(e) => setShipping((s) => ({ ...s, address_1: e.target.value }))} />
                  )}
                  <input className={inputClass} placeholder="City" required value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} />
                  {shipping.country === "CA" ? (
                    <select value={shipping.province} onChange={(e) => setShipping((s) => ({ ...s, province: e.target.value }))} className={inputClass + " w-full"} required>
                      <option value="">Province</option>
                      {CANADIAN_PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input className={inputClass} placeholder="State / Province" required value={shipping.province} onChange={(e) => setShipping((s) => ({ ...s, province: e.target.value }))} />
                  )}
                  <input className={inputClass} placeholder="Postal code" required value={shipping.postal_code} onChange={(e) => setShipping((s) => ({ ...s, postal_code: e.target.value }))} />
                  <div className="md:col-span-2">
                    <select value={shipping.country} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} className={inputClass + " w-full"} required>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-foreground">Boxes going here (unassigned to custom addresses)</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {cart.items.map((item) => {
                    const total = item.quantity
                    const mainQty = assignment.main[item.lineId] ?? 0
                    return (
                      <div key={item.lineId} className="flex items-center gap-2">
                        <label className="text-sm text-slate-700">{item.title}:</label>
                        <span className="text-sm font-medium text-slate-800">{mainQty} of {total}</span>
                      </div>
                    )
                  })}
                </div>
                {unitsByDestination.main.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="text-xs font-medium text-foreground">Gift options for boxes going here</p>
                    <div className="mt-2 space-y-3">
                      {unitsByDestination.main.map(({ key, lineId, unitIndex, boxLabel }) => {
                        const gift = giftByLineUnit[key] ?? { enabled: false, message: "" }
                        return (
                          <div key={key} className="rounded border border-gray-200 bg-gray-50 p-3">
                            <p className="text-sm font-medium text-foreground">{boxLabel}</p>
                            <label className="mt-2 flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={gift.enabled}
                                onChange={(e) => setGiftForUnit(lineId, unitIndex, e.target.checked, gift.message)}
                                className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                              />
                              <span className="text-sm text-foreground">Add gift box (wrapping + gift card) — $3.99</span>
                            </label>
                            {gift.enabled && (
                              <div className="mt-3">
                                <label htmlFor={`gift-${key}`} className="block text-sm font-medium text-foreground">Gift card message <span className="text-light_coral-500">*</span></label>
                                <textarea
                                  id={`gift-${key}`}
                                  value={gift.message}
                                  onChange={(e) => setGiftForUnit(lineId, unitIndex, true, e.target.value)}
                                  placeholder="e.g. Happy Birthday!"
                                  required={gift.enabled}
                                  rows={2}
                                  maxLength={500}
                                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom address cards: address form + quantity assignment + gift options */}
              {customAddresses.map((addr, idx) => (
                <div key={idx} className="rounded-lg border border-gray-300 bg-white p-4 text-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Custom address {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomAddress(idx)}
                      className="text-xs font-medium text-light_coral-600 hover:text-light_coral"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input className={inputClass} placeholder="First name" value={addr.first_name} onChange={(e) => setCustomAddressAt(idx, { first_name: e.target.value })} />
                    <input className={inputClass} placeholder="Last name" value={addr.last_name} onChange={(e) => setCustomAddressAt(idx, { last_name: e.target.value })} />
                    {placesLoaded ? (
                      <AddressAutocomplete
                        placesReady={placesLoaded}
                        className={inputClass + " md:col-span-2"}
                        placeholder="Address"
                        value={addr.address_1}
                        onChange={(v) => setCustomAddressAt(idx, { address_1: v })}
                        onAddressSelect={(a) => setCustomAddressAt(idx, a)}
                      />
                    ) : (
                      <input className={inputClass + " md:col-span-2"} placeholder="Address" value={addr.address_1} onChange={(e) => setCustomAddressAt(idx, { address_1: e.target.value })} />
                    )}
                    <input className={inputClass} placeholder="City" value={addr.city} onChange={(e) => setCustomAddressAt(idx, { city: e.target.value })} />
                    {addr.country === "CA" ? (
                      <select value={addr.province} onChange={(e) => setCustomAddressAt(idx, { province: e.target.value })} className={inputClass + " w-full"}>
                        <option value="">Province</option>
                        {CANADIAN_PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                      </select>
                    ) : (
                      <input className={inputClass} placeholder="State / Province" value={addr.province} onChange={(e) => setCustomAddressAt(idx, { province: e.target.value })} />
                    )}
                    <input className={inputClass} placeholder="Postal code" value={addr.postal_code} onChange={(e) => setCustomAddressAt(idx, { postal_code: e.target.value })} />
                    <div className="md:col-span-2">
                      <select value={addr.country} onChange={(e) => setCustomAddressAt(idx, { country: e.target.value })} className={inputClass + " w-full"}>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4">
                    {cart.items.map((item) => {
                      const total = item.quantity
                      const q = assignment.custom[idx]?.[item.lineId] ?? 0
                      return (
                        <div key={item.lineId} className="flex items-center gap-2">
                          <label className="text-sm text-foreground">{item.title}:</label>
                          <input
                            type="number"
                            min={0}
                            max={total}
                            value={q}
                            onChange={(e) => setAssignmentCustom(idx, item.lineId, Math.max(0, Math.floor(Number(e.target.value)) || 0))}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                          />
                          <span className="text-xs text-slate-500">of {total}</span>
                        </div>
                      )
                    })}
                  </div>
                  {unitsByDestination.custom[idx]?.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <p className="text-xs font-medium text-foreground">Gift options for boxes going here</p>
                      <div className="mt-2 space-y-3">
                        {unitsByDestination.custom[idx].map(({ key, lineId, unitIndex, boxLabel }) => {
                          const gift = giftByLineUnit[key] ?? { enabled: false, message: "" }
                          return (
                            <div key={key} className="rounded border border-gray-200 bg-gray-50 p-3">
                              <p className="text-sm font-medium text-foreground">{boxLabel}</p>
                              <label className="mt-2 flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={gift.enabled}
                                  onChange={(e) => setGiftForUnit(lineId, unitIndex, e.target.checked, gift.message)}
                                  className="mt-1 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-sm text-foreground">Add gift box (wrapping + gift card) — $3.99</span>
                              </label>
                              {gift.enabled && (
                                <div className="mt-3">
                                  <label htmlFor={`gift-${key}`} className="block text-sm font-medium text-foreground">Gift card message <span className="text-light_coral-500">*</span></label>
                                  <textarea
                                    id={`gift-${key}`}
                                    value={gift.message}
                                    onChange={(e) => setGiftForUnit(lineId, unitIndex, true, e.target.value)}
                                    placeholder="e.g. Happy Birthday!"
                                    required={gift.enabled}
                                    rows={2}
                                    maxLength={500}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addCustomAddress}
                className="w-full rounded-md border border-dashed border-powder_petal-200 bg-powder_petal-50 py-2.5 text-sm font-semibold text-foreground transition hover:bg-powder_petal-100 hover:border-powder_petal-200"
              >
                + Add another destination
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Payment</h2>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="credit_card"
                  checked={paymentMethod === "credit_card"}
                  onChange={() => setPaymentMethod("credit_card")}
                  className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-foreground">Credit card</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={paymentMethod === "paypal"}
                  onChange={() => setPaymentMethod("paypal")}
                  className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-foreground">PayPal</span>
              </label>
            </div>
            <div className="mt-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Or pay with</p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("google_pay")}
                  className={`flex h-10 items-center rounded-md border px-3 transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${paymentMethod === "google_pay" ? "border-brand-500 ring-2 ring-brand-500 ring-offset-2" : "border-gray-300 bg-white hover:border-gray-400"}`}
                  aria-pressed={paymentMethod === "google_pay"}
                  aria-label="Pay with Google Pay"
                >
                  <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Buy_with_GPay_button.png"
                    alt=""
                    width={120}
                    height={40}
                    unoptimized
                    className="h-8 w-auto object-contain"
                  />
                </button>
                <Script
                  src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js"
                  strategy="lazyOnload"
                  onLoad={() => setApplePayReady(true)}
                />
                <div
                  ref={applePayButtonRef}
                  className={`flex h-10 items-center rounded-md border transition focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 ${paymentMethod === "apple_pay" ? "border-brand-500 ring-2 ring-brand-500 ring-offset-2" : "border-gray-300"}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPaymentMethod("apple_pay")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPaymentMethod("apple_pay")}
                  aria-pressed={paymentMethod === "apple_pay"}
                  aria-label="Pay with Apple Pay"
                />
                <button
                  type="button"
                  onClick={() => setPaymentMethod("shop_pay")}
                  className={`flex h-10 items-center rounded-md border px-4 transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${paymentMethod === "shop_pay" ? "border-brand-500 ring-2 ring-brand-500 ring-offset-2" : "border-[#2d2d2d] bg-[#2d2d2d] hover:bg-[#1a1a1a]"}`}
                  aria-pressed={paymentMethod === "shop_pay"}
                  aria-label="Pay with Shop Pay"
                >
                  <span className="text-sm font-semibold tracking-tight text-white">Shop Pay</span>
                </button>
              </div>
            </div>
            {paymentMethod === "credit_card" && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="checkout-card-number" className="mb-1 block text-sm font-medium text-foreground">
                    Card number
                  </label>
                  <input
                    id="checkout-card-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    className={inputClass + " w-full"}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="checkout-name-on-card" className="mb-1 block text-sm font-medium text-foreground">
                    Name on card
                  </label>
                  <input
                    id="checkout-name-on-card"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Name on card"
                    className={inputClass + " w-full"}
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-card-expiry" className="mb-1 block text-sm font-medium text-foreground">
                    Expiration date (MM/YY)
                  </label>
                  <input
                    id="checkout-card-expiry"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    maxLength={5}
                    className={inputClass + " w-full"}
                    value={cardExpiry}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "")
                      if (v.length <= 2) setCardExpiry(v)
                      else if (v.length <= 4) setCardExpiry(v.slice(0, 2) + "/" + v.slice(2))
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-card-cvc" className="mb-1 block text-sm font-medium text-foreground">
                    CVC
                  </label>
                  <input
                    id="checkout-card-cvc"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="CVC"
                    maxLength={4}
                    className={inputClass + " w-full"}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
              </div>
            )}
          </section>

        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-base font-semibold text-foreground">Order summary</h2>
        {cart?.items?.length ? (
          <ul className="mt-4 space-y-4 border-b border-gray-200 pb-4">
            {cart.items.map((item) => {
              const [name, variant] = item.title.includes(" - ")
                ? item.title.split(/ - (.+)/).filter(Boolean)
                : [item.title, ""]
              return (
                <li key={item.lineId} className="flex items-center gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                    <img
                      src={item.image ?? "https://placehold.co/64x64?text=Snack+Box"}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    {variant ? <p className="text-xs text-muted-foreground">{variant}</p> : null}
                    <p className="text-sm text-foreground">${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded border border-gray-300 bg-white">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.title}`}
                        disabled={updating || item.quantity <= 1}
                        onClick={() => updateItem(item.lineId, Math.max(1, item.quantity - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-l text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.title}`}
                        disabled={updating}
                        onClick={() => updateItem(item.lineId, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-r text-muted-foreground hover:bg-gray-50 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.title} from order`}
                      disabled={updating}
                      onClick={() => removeItem(item.lineId)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-gray-200 hover:text-foreground disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.518.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
        <div className="mt-4 space-y-2 text-sm text-foreground">
          {addressBreakdown.length > 0 ? (
            addressBreakdown.map((addr) => {
              const isMainAddressOnly =
                useVendureTotals && addressBreakdown.length === 1
              const rowShipping = isMainAddressOnly ? displayShipping : addr.shipping
              const rowTax = isMainAddressOnly ? displayTax : addr.taxAmount
              const rowTotal =
                isMainAddressOnly
                  ? addr.subtotal + displayShipping + addr.giftFee + displayTax
                  : addr.totalForAddress
              const taxRateDisplay =
                rowTax > 0 && addr.subtotal + rowShipping + addr.giftFee > 0
                  ? ((rowTax / (addr.subtotal + rowShipping + addr.giftFee)) * 100).toFixed(1)
                  : (addr.taxRate * 100).toFixed(1)
              return (
                <div key={addr.label} className="space-y-2 border-t border-gray-200 pt-3 first:border-t-0 first:pt-0">
                  <p className="font-medium text-foreground">{addr.label}</p>
                  <div className="space-y-1 pl-0">
                    {addr.lineItems.map((li, idx) => (
                      <div key={`${addr.label}-${idx}-${li.lineId}`} className="flex justify-between text-muted-foreground">
                        <span>
                          {li.title}
                          <span className="ml-1 text-muted-foreground">
                            {li.quantity} × ${li.unitPrice.toFixed(2)}
                          </span>
                        </span>
                        <span>${li.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium text-foreground">
                      <span>Boxes total</span>
                      <span>${addr.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  {addr.giftCount > 0 && (
                    <div className="flex justify-between pl-0 text-muted-foreground">
                      <span>Gift box ({addr.giftCount} × ${GIFT_BOX_FEE.toFixed(2)})</span>
                      <span>${addr.giftFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pl-0 text-muted-foreground">
                    <span>Shipping</span>
                    <span>${rowShipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pl-0 font-medium text-foreground">
                    <span>Subtotal (before tax)</span>
                    <span>${(addr.subtotal + addr.giftFee + rowShipping).toFixed(2)}</span>
                  </div>
                  {rowTax > 0 && (
                    <div className="flex justify-between pl-0 text-muted-foreground">
                      <span>Tax ({taxRateDisplay}%)</span>
                      <span>${rowTax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-medium text-foreground">
                    <span>Total for this address</span>
                    <span>${rowTotal.toFixed(2)}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <>
              <div className="flex justify-between font-medium text-foreground">
                <span>Boxes total</span>
                <span>${(cart?.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {giftCount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Gift box ({giftCount} × ${GIFT_BOX_FEE.toFixed(2)})</span>
                  <span>${giftFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>
                  {shipping.country && shipping.province ? (
                    `$${displayShipping.toFixed(2)}`
                  ) : (
                    <span className="text-muted-foreground">Enter address</span>
                  )}
                </span>
              </div>
              {shipping.country && shipping.province && (
                <div className="flex justify-between font-medium text-foreground">
                  <span>Subtotal (before tax)</span>
                  <span>${((cart?.subtotal ?? 0) + giftFee + displayShipping).toFixed(2)}</span>
                </div>
              )}
              {shipping.country && shipping.province && displayTax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>${displayTax.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          <section className="mt-4 rounded-md border border-white/20 bg-footer p-4 text-white">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Grand total
            </h3>
            <div className="mt-3 space-y-2 text-sm text-white/90">
              <div className="flex justify-between">
                <span>Total for all boxes</span>
                <span>${(cart?.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {giftFee > 0 && (
                <div className="flex justify-between">
                  <span>Total gift box charge</span>
                  <span>${giftFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total shipping costs</span>
                <span>${displayShipping.toFixed(2)}</span>
              </div>
              {addressBreakdown.length > 0 ? (
                (() => {
                  const taxByProvince = addressBreakdown.reduce(
                    (acc, addr) => {
                      if (addr.taxAmount <= 0) return acc
                      acc[addr.provinceLabel] = (acc[addr.provinceLabel] ?? 0) + addr.taxAmount
                      return acc
                    },
                    {} as Record<string, number>
                  )
                  return Object.entries(taxByProvince).map(([prov, amount]) => (
                    <div key={prov} className="flex justify-between">
                      <span>Total tax ({prov})</span>
                      <span>${amount.toFixed(2)}</span>
                    </div>
                  ))
                })()
              ) : (
                displayTax > 0 && (
                  <div className="flex justify-between">
                    <span>Total tax</span>
                    <span>${displayTax.toFixed(2)}</span>
                  </div>
                )
              )}
              <div className="flex justify-between border-t border-white/20 pt-2 text-base font-semibold text-white">
                <span>Grand total</span>
                <span>${displayOrderTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/themed-snack-boxes"
            className="text-center text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Continue Shopping
          </Link>
          <Button
            type="submit"
            form="checkout-form"
            variant="secondary"
            disabled={processing}
            className="w-full"
          >
            {processing ? "Placing order..." : "Confirm order"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
