import { NextRequest, NextResponse } from "next/server"
import {
  checkoutEmailUpdate,
  checkoutShippingAddressUpdate,
  checkoutBillingAddressUpdate,
  getCheckoutShippingMethods,
  checkoutDeliveryMethodUpdate,
  checkoutTransitionToArrangingPayment,
  createStripePaymentIntent,
  getActiveOrder,
  getShopActiveOrderSnapshot,
  activeOrderHasShopCustomer,
  checkoutComplete,
  customerRegister,
  customerLoginWithCookies,
  setOrderCheckoutGiftSurchargeCents,
  assertActiveOrderReadyForArrangingPayment,
  type StorefrontAddressInput,
  storefrontDisplayCurrency
} from "../../../../lib/vendure"
import { cookieSecureFromRequest } from "../../../../lib/cookie-secure"
import { checkoutGiftSurchargeMinorUnits } from "../../../../lib/checkout-gift-surcharge"

// Vendure: active order is from session (cookie). Forward request cookie to all Vendure calls.

type AddressPayload = {
  first_name: string
  last_name: string
  email?: string
  address_1: string
  city: string
  province: string
  postal_code: string
  /** May be string "CA" or object { code: "CA", name: "Canada" } from form */
  country: string | { code?: string; name?: string }
}

/** Normalize country to 2-letter code for Vendure (expects countryCode string). */
function toCountryCode(c: string | { code?: string; name?: string } | undefined): string {
  if (c == null) return "CA"
  if (typeof c === "string") {
    const s = c.trim()
    if (s.length === 2) return s.toUpperCase()
    if (/canada/i.test(s)) return "CA"
    if (/united states|usa|us/i.test(s)) return "US"
    return s.slice(0, 2).toUpperCase() || "CA"
  }
  const code = c.code?.trim()
  if (code) return code.length === 2 ? code.toUpperCase() : code.slice(0, 2).toUpperCase()
  if (c.name) return toCountryCode(c.name)
  return "CA"
}

function toStorefrontAddressInput(a: AddressPayload): StorefrontAddressInput {
  return {
    firstName: a.first_name?.trim() ?? "",
    lastName: a.last_name?.trim() ?? "",
    streetAddress1: a.address_1?.trim() ?? "",
    streetAddress2: null,
    city: a.city?.trim() ?? "",
    postalCode: a.postal_code?.trim() ?? "",
    country: toCountryCode(a.country),
    countryArea: a.province?.trim() || null,
    phone: null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      checkoutId: _checkoutId,
      email,
      billing,
      shipping,
      createAccount,
      storefrontShippingAmount,
      storefrontShippingLabel
    }: {
      checkoutId?: string
      email: string
      billing: AddressPayload
      shipping: AddressPayload
      createAccount?: { password: string }
      storefrontShippingAmount?: number
      storefrontShippingLabel?: string
      /** Number of boxes with gift option; capped to order quantity server-side. */
      giftBoxCount?: number
      /** Per-unit gift messages for fulfillment (stored on payment metadata when possible). */
      giftByLineUnit?: Record<string, { giftMessage?: string }>
    } = body

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const cookieHeader = request.headers.get("cookie") ?? undefined
    const bearer = request.cookies.get("vendure_token")?.value

    /** Vendure active cart lives on the Shop API session cookie — it is not sent to /shop-api if missing here. */
    if (!cookieHeader?.trim()) {
      return NextResponse.json(
        {
          error:
            "Your checkout session was lost (no cart cookie). Enable cookies, refresh the page, and try again."
        },
        { status: 400 }
      )
    }

    let opts: { cookie?: string; authToken?: string } = {
      cookie: cookieHeader,
      ...(bearer ? { authToken: bearer } : {}),
    }

    const origin = request.nextUrl.origin
    const redirectUrl = `${origin}/order/complete`

    let authToken: string | null = null
    let refreshToken: string | null = null
    if (createAccount?.password && createAccount.password.trim().length >= 8) {
      try {
        await customerRegister({
          email: email.trim(),
          password: createAccount.password.trim(),
          firstName: billing?.first_name?.trim() ?? "",
          lastName: billing?.last_name?.trim() ?? ""
        })
      } catch {
        // User may already exist; continue to login
      }
      try {
        // Must use the browser session cookie so Vendure merges the guest cart with the new account.
        const loginResult = await customerLoginWithCookies(
          email.trim(),
          createAccount.password.trim(),
          cookieHeader
        )
        authToken = loginResult.token
        refreshToken = loginResult.refreshToken
        // Keep forwarding the session cookie *and* Bearer so Vendure stays on the same shop session
        // while authenticating (dropping the cookie can lose the merged cart / break Owner-only mutations).
        opts = { cookie: cookieHeader, authToken: loginResult.token }
      } catch (attachErr) {
        const msg = attachErr instanceof Error ? attachErr.message : "Could not attach account to order"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    // Vendure requires a Customer on the order before ArrangingPayment. Do not skip this just because
    // Bearer is set — carts can still lack a customer (stale token, session edge cases, etc.).
    // IMPORTANT: Do not swallow setCustomerForOrder errors (e.g. "already logged in" from the *old*
    // DefaultGuestCheckoutStrategy). That leaves no customer on the order and fails later with a
    // confusing message — use LinkGuestCheckoutStrategy on the server instead.
    //
    // Guest sessions (no vendure_token): the active order may already have a Customer from an earlier
    // checkout attempt or cart step. If we skip setCustomerForOrder whenever `customer` exists, the
    // shopper can change the email on the form but the server keeps the old Customer — including a
    // stale Stripe customer id — and Stripe returns "No such customer". Always sync the submitted
    // email for guests. Authenticated shoppers keep the existing customer when already set.
    const isShopAuthenticated = Boolean(opts.authToken)
    const orderAlreadyHasCustomer = await activeOrderHasShopCustomer(opts)
    if (!orderAlreadyHasCustomer || !isShopAuthenticated) {
      await checkoutEmailUpdate("", email.trim(), opts, billing?.first_name, billing?.last_name)
    }
    if (!(await activeOrderHasShopCustomer(opts))) {
      return NextResponse.json(
        {
          error:
            "We could not link your email to this cart on the server (required for payment). " +
            "Try signing out and checking out again, or use another browser. " +
            "If this persists, confirm the Vendure server is deployed with LinkGuestCheckoutStrategy (see apps/vendure/src/link-guest-checkout-strategy.ts)."
        },
        { status: 400 }
      )
    }
    try {
      await checkoutShippingAddressUpdate("", toStorefrontAddressInput(shipping), opts)
    } catch (shippingErr) {
      const msg = shippingErr instanceof Error ? shippingErr.message : ""
      if (!msg.includes("doesn't need shipping")) throw shippingErr
    }
    await checkoutBillingAddressUpdate("", toStorefrontAddressInput(billing), opts)

    const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
    const paymentSnapshot = await getShopActiveOrderSnapshot(opts)
    /**
     * Vendure only allows setOrderShippingMethod in AddingItems/Draft. A double-submit or retry after
     * the first successful transition leaves the order in ArrangingPayment — re-calling shipping method
     * fails with "Order contents may only be modified when in the 'AddingItems' state".
     */
    const skipShippingMethodBecauseAwaitingPayment =
      Boolean(stripePublishable) && paymentSnapshot?.state === "ArrangingPayment"

    if (!skipShippingMethodBecauseAwaitingPayment) {
      const shippingMethods = await getCheckoutShippingMethods("", opts)
      if (shippingMethods.length === 0) {
        return NextResponse.json(
          {
            error:
              "No shipping methods are available for this address on the server. Check postal code and country, confirm zones are seeded in Vendure, then try again."
          },
          { status: 400 }
        )
      }
      await checkoutDeliveryMethodUpdate("", shippingMethods[0].id, opts)
    }

    const metadata: { key: string; value: string }[] = []

    const giftBoxCountRaw = body.giftBoxCount
    const giftBoxCount =
      typeof giftBoxCountRaw === "number" && Number.isFinite(giftBoxCountRaw)
        ? Math.max(0, Math.floor(giftBoxCountRaw))
        : 0
    const previewForGift = await getActiveOrder(opts)
    const maxBoxes =
      previewForGift?.lines?.reduce((sum, l) => sum + l.quantity, 0) ?? 0
    const giftSurchargeMinor = checkoutGiftSurchargeMinorUnits(
      giftBoxCount,
      maxBoxes,
      toCountryCode(shipping.country),
      (shipping.province ?? "").trim()
    )
    await setOrderCheckoutGiftSurchargeCents(
      giftSurchargeMinor > 0 ? giftSurchargeMinor : null,
      opts
    )

    const gbu = body.giftByLineUnit
    if (gbu && typeof gbu === "object" && Object.keys(gbu).length > 0) {
      try {
        const json = JSON.stringify(gbu)
        if (json.length < 12_000) {
          metadata.push({ key: "gift_by_line_unit_json", value: json })
        }
      } catch {
        /* ignore */
      }
    }

    if (typeof storefrontShippingAmount === "number") {
      metadata.push({ key: "storefront_shipping_amount", value: String(storefrontShippingAmount) })
    }
    if (storefrontShippingLabel?.trim()) {
      metadata.push({ key: "storefront_shipping_label", value: storefrontShippingLabel.trim() })
    }

    await assertActiveOrderReadyForArrangingPayment(opts)
    await checkoutTransitionToArrangingPayment(opts)

    /** @see https://docs.vendure.io/current/core/reference/core-plugins/payments-plugin/stripe-plugin */
    if (stripePublishable) {
      try {
        const clientSecret = await createStripePaymentIntent(opts)
        const preview = await getActiveOrder(opts)
        const orderCode = preview?.code
        if (!orderCode) {
          return NextResponse.json(
            { error: "Could not read order after preparing payment. Try again." },
            { status: 400 }
          )
        }
        const currency = storefrontDisplayCurrency(
          preview?.currencyCode?.trim() || preview?.totalPrice?.gross?.currency || undefined,
        )
        const giftBoxCount =
          typeof body.giftBoxCount === "number" && Number.isFinite(body.giftBoxCount)
            ? Math.max(0, Math.floor(body.giftBoxCount))
            : 0
        const giftLines: { unitKey: string; message: string }[] = []
        const gbu = body.giftByLineUnit
        if (gbu && typeof gbu === "object") {
          for (const [unitKey, v] of Object.entries(gbu)) {
            const msg = v && typeof v === "object" && "giftMessage" in v ? String((v as { giftMessage?: string }).giftMessage ?? "").trim() : ""
            if (msg) giftLines.push({ unitKey, message: msg })
          }
        }
        const json = NextResponse.json({
          confirmationNeeded: true,
          clientSecret,
          orderCode,
          createdAccount: authToken ? true : undefined,
          orderSummary: {
            email: email.trim(),
            total: preview?.totalPrice?.gross?.amount ?? 0,
            currency,
            subTotalNet: preview?.subtotalPrice?.net?.amount,
            subTotalGross: preview?.subtotalPrice?.gross?.amount,
            shippingNet: preview?.shippingPrice?.net?.amount,
            shippingGross: preview?.shippingPrice?.gross?.amount,
            /** Full order tax (lines + shipping, etc.); replaces misleading line-only taxEstimate. */
            taxLines: preview?.taxSummary?.length
              ? preview.taxSummary.map((t) => ({
                  description: t.description,
                  taxRate: t.taxRate,
                  taxTotal: t.taxTotal,
                }))
              : undefined,
            taxEstimate: preview?.taxSummary?.length
              ? preview.taxSummary.reduce((s, t) => s + t.taxTotal, 0)
              : preview?.subtotalPrice?.gross?.amount != null &&
                  preview?.subtotalPrice?.net?.amount != null
                ? preview.subtotalPrice.gross.amount - preview.subtotalPrice.net.amount
                : undefined,
            amountPaid: preview?.totalPrice?.gross?.amount,
            giftPackagingAmount:
              typeof preview?.giftPackagingAmount === "number" && preview.giftPackagingAmount > 0
                ? preview.giftPackagingAmount
                : giftBoxCount > 0
                  ? checkoutGiftSurchargeMinorUnits(
                      giftBoxCount,
                      preview?.lines?.reduce((s, l) => s + l.quantity, 0) ?? 0,
                      toCountryCode(shipping.country),
                      (shipping.province ?? "").trim()
                    ) / 100
                  : undefined,
            giftLineMessages: giftLines.length ? giftLines : undefined,
            lines: (preview?.lines ?? []).map((l) => {
              const unitNet = l.variant.pricing?.price?.net?.amount ?? 0
              const lineNet =
                l.lineTotalNet?.amount ?? (unitNet > 0 ? unitNet * l.quantity : 0)
              return {
                productName: l.variant.product.name,
                variantName: l.variant.name || null,
                quantity: l.quantity,
                unitPrice: unitNet,
                lineTotalNet: lineNet > 0 ? lineNet : undefined,
                lineTotalWithTax: l.totalPrice?.gross?.amount,
              }
            }),
            shippingAddress: {
              firstName: shipping.first_name?.trim() ?? "",
              lastName: shipping.last_name?.trim() ?? "",
              streetAddress1: shipping.address_1?.trim() ?? "",
              city: shipping.city?.trim() ?? "",
              postalCode: shipping.postal_code?.trim() ?? "",
              countryArea: shipping.province?.trim() || null
            }
          }
        })
        if (authToken && refreshToken) {
          const secure = cookieSecureFromRequest(request)
          json.cookies.set("vendure_token", authToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/"
          })
          json.cookies.set("vendure_refresh_token", refreshToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/"
          })
        }
        return json
      } catch (stripeErr) {
        const msg = stripeErr instanceof Error ? stripeErr.message : "Stripe checkout failed"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    const result = await checkoutComplete(
      "",
      redirectUrl,
      {
        metadata: metadata.length ? metadata : undefined
      },
      opts
    )

    if (result.errors?.length) {
      const message = result.errors[0]?.message ?? "Checkout could not be completed"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Stripe may require client-side confirmation (e.g. 3DS). Return client_secret for frontend.
    if (result.confirmationNeeded && result.confirmationData) {
      let confirmationData: { client_secret?: string }
      try {
        confirmationData = JSON.parse(result.confirmationData) as { client_secret?: string }
      } catch {
        confirmationData = {}
      }
      return NextResponse.json({
        confirmationNeeded: true,
        clientSecret: confirmationData.client_secret ?? null,
        confirmationData: result.confirmationData
      })
    }

    if (!result.order?.token) {
      return NextResponse.json(
        { error: "Order was not created. Payment may be required." },
        { status: 400 }
      )
    }

    const createdAccount = !!authToken

    const response = NextResponse.json({
      orderToken: result.order.token,
      orderNumber: result.order.number,
      createdAccount: createdAccount || undefined,
      orderSummary: {
        email: email.trim(),
        total: result.order.total?.gross?.amount ?? 0,
        currency: storefrontDisplayCurrency(
          result.order.currencyCode ?? result.order.total?.gross?.currency,
        ),
        subTotalNet: result.order.subTotal?.net?.amount,
        subTotalGross: result.order.subTotalWithTax?.gross?.amount,
        shippingNet: result.order.shipping?.net?.amount,
        shippingGross: result.order.shippingWithTax?.gross?.amount,
        taxLines: result.order.taxSummary?.map((t) => ({
          description: t.description,
          taxRate: t.taxRate,
          taxTotal: t.taxTotal.amount
        })),
        giftPackagingAmount: result.order.giftPackaging?.amount,
        giftLineMessages:
          result.order.giftLineMessages?.length ? result.order.giftLineMessages : undefined,
        amountPaid: result.order.amountPaid?.amount,
        lines: (result.order.lines ?? []).map((l) => ({
          productName: l.productName,
          variantName: l.variantName ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice.net.amount,
          lineTotalNet: l.lineTotalNet.amount,
          lineTotalWithTax: l.lineTotalWithTax.amount,
        })),
        shippingAddress: result.order.shippingAddress
          ? {
              firstName: result.order.shippingAddress.firstName,
              lastName: result.order.shippingAddress.lastName,
              streetAddress1: result.order.shippingAddress.streetAddress1,
              city: result.order.shippingAddress.city,
              postalCode: result.order.shippingAddress.postalCode,
              countryArea: result.order.shippingAddress.countryArea ?? null
            }
          : null
      }
    })

    if (authToken && refreshToken) {
      const secure = cookieSecureFromRequest(request)
      response.cookies.set("vendure_token", authToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      response.cookies.set("vendure_refresh_token", refreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      })
    }

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
