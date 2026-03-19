import { NextRequest, NextResponse } from "next/server"
import {
  checkoutEmailUpdate,
  checkoutShippingAddressUpdate,
  checkoutBillingAddressUpdate,
  getCheckoutShippingMethods,
  checkoutDeliveryMethodUpdate,
  getCheckoutTotalPrice,
  checkoutPaymentCreate,
  checkoutComplete,
  checkoutCustomerAttach,
  customerRegister,
  customerLogin,
  type StorefrontAddressInput
} from "../../../../lib/vendure"
import { cookieSecureFromRequest } from "../../../../lib/cookie-secure"

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
      storefrontShippingLabel,
      paymentMethodId
    }: {
      checkoutId?: string
      email: string
      billing: AddressPayload
      shipping: AddressPayload
      createAccount?: { password: string }
      storefrontShippingAmount?: number
      storefrontShippingLabel?: string
      paymentMethodId?: string
    } = body

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const cookieHeader = request.headers.get("cookie") ?? undefined
    const opts = { cookie: cookieHeader }

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
        const loginResult = await customerLogin(email.trim(), createAccount.password.trim())
        authToken = loginResult.token
        refreshToken = loginResult.refreshToken
        await checkoutCustomerAttach("", loginResult.token, opts)
      } catch (attachErr) {
        const msg = attachErr instanceof Error ? attachErr.message : "Could not attach account to order"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    await checkoutEmailUpdate("", email.trim(), opts, billing?.first_name, billing?.last_name)
    try {
      await checkoutShippingAddressUpdate("", toStorefrontAddressInput(shipping), opts)
    } catch (shippingErr) {
      const msg = shippingErr instanceof Error ? shippingErr.message : ""
      if (!msg.includes("doesn't need shipping")) throw shippingErr
    }
    await checkoutBillingAddressUpdate("", toStorefrontAddressInput(billing), opts)

    const shippingMethods = await getCheckoutShippingMethods("", opts)
    const firstMethod = shippingMethods[0]
    if (firstMethod) {
      await checkoutDeliveryMethodUpdate("", firstMethod.id, opts)
    }

    const metadata: { key: string; value: string }[] = []
    if (typeof storefrontShippingAmount === "number") {
      metadata.push({ key: "storefront_shipping_amount", value: String(storefrontShippingAmount) })
    }
    if (storefrontShippingLabel?.trim()) {
      metadata.push({ key: "storefront_shipping_label", value: storefrontShippingLabel.trim() })
    }

    const stripeGateway = process.env.VENDURE_STRIPE_METHOD_CODE || "stripe"
    if (paymentMethodId?.trim()) {
      const amount = await getCheckoutTotalPrice("", opts)
      await checkoutPaymentCreate("", {
        gateway: stripeGateway,
        amount,
        token: paymentMethodId.trim()
      })
    }

    const paymentData =
      paymentMethodId?.trim() ?
        JSON.stringify({ payment_method_id: paymentMethodId.trim() })
      : undefined
    const result = await checkoutComplete("", redirectUrl, {
      metadata: metadata.length ? metadata : undefined,
      paymentData
    }, opts)

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
      createdAccount: createdAccount || undefined
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
