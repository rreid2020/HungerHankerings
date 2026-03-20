import { NextRequest, NextResponse } from "next/server"
import {
  checkoutEmailUpdate,
  checkoutShippingAddressUpdate,
  checkoutBillingAddressUpdate,
  getCheckoutShippingMethods,
  checkoutDeliveryMethodUpdate,
  checkoutComplete,
  customerRegister,
  customerLoginWithCookies,
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
        // After login, use Bearer only for the rest of this request — merged order is tied to this token.
        opts = { authToken: loginResult.token }
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
      createdAccount: createdAccount || undefined,
      orderSummary: {
        email: email.trim(),
        total: result.order.total?.gross?.amount ?? 0,
        currency: result.order.total?.gross?.currency ?? "CAD",
        lines: (result.order.lines ?? []).map((l) => ({
          productName: l.productName,
          variantName: l.variantName ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice?.gross?.amount ?? 0
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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
