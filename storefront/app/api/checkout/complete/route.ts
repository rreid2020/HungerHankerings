import { cookies } from "next/headers"
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
  type SaleorAddressInput
} from "../../../../lib/saleor"

// Note: Saleor must allow unpaid orders for this to work without a payment gateway.
// In Saleor Dashboard: Channel → Order settings → set "Allow unpaid orders" if needed.

type AddressPayload = {
  first_name: string
  last_name: string
  email?: string
  address_1: string
  city: string
  province: string
  postal_code: string
  country: string
}

function toSaleorAddress(a: AddressPayload): SaleorAddressInput {
  return {
    firstName: a.first_name?.trim() ?? "",
    lastName: a.last_name?.trim() ?? "",
    streetAddress1: a.address_1?.trim() ?? "",
    streetAddress2: null,
    city: a.city?.trim() ?? "",
    postalCode: a.postal_code?.trim() ?? "",
    country: a.country?.trim() || "CA",
    countryArea: a.province?.trim() || null,
    phone: null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      checkoutId,
      email,
      billing,
      shipping,
      createAccount,
      storefrontShippingAmount,
      storefrontShippingLabel,
      paymentMethodId
    }: {
      checkoutId: string
      email: string
      billing: AddressPayload
      shipping: AddressPayload
      createAccount?: { password: string }
      storefrontShippingAmount?: number
      storefrontShippingLabel?: string
      /** Stripe payment method id (pm_xxx) from Stripe.js; required when Stripe plugin is active */
      paymentMethodId?: string
    } = body

    if (!checkoutId || !email?.trim()) {
      return NextResponse.json(
        { error: "Checkout ID and email are required" },
        { status: 400 }
      )
    }

    const origin = request.nextUrl.origin
    const redirectUrl = `${origin}/order/complete`

    // When "Create account" is checked: register → login → attach checkout to user BEFORE completing.
    // That way the order is linked to the new account and appears on their dashboard.
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
        // User may already exist (e.g. created account on a previous visit); continue to login
      }
      try {
        const loginResult = await customerLogin(email.trim(), createAccount.password.trim())
        authToken = loginResult.token
        refreshToken = loginResult.refreshToken
        await checkoutCustomerAttach(checkoutId, loginResult.token)
      } catch (attachErr) {
        const msg = attachErr instanceof Error ? attachErr.message : "Could not attach account to checkout"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    await checkoutEmailUpdate(checkoutId, email.trim())
    await checkoutShippingAddressUpdate(checkoutId, toSaleorAddress(shipping))
    await checkoutBillingAddressUpdate(checkoutId, toSaleorAddress(billing))

    const shippingMethods = await getCheckoutShippingMethods(checkoutId)
    const firstMethod = shippingMethods[0]
    if (!firstMethod) {
      return NextResponse.json(
        {
          error:
            "Saleor requires at least one shipping method to complete checkout. Add a single shipping method in Saleor Dashboard (e.g. Shipping → Add zone → Add rate: name \"Standard\", price 0). Your real shipping rates (by province/international) stay in the storefront only; this method is just a placeholder so checkout can complete."
        },
        { status: 400 }
      )
    }
    await checkoutDeliveryMethodUpdate(checkoutId, firstMethod.id)

    const metadata: { key: string; value: string }[] = []
    if (typeof storefrontShippingAmount === "number") {
      metadata.push({ key: "storefront_shipping_amount", value: String(storefrontShippingAmount) })
    }
    if (storefrontShippingLabel?.trim()) {
      metadata.push({ key: "storefront_shipping_label", value: storefrontShippingLabel.trim() })
    }

    // When Stripe is enabled: create payment then complete. Works for guest and logged-in users.
    const stripeGateway =
      process.env.SALEOR_STRIPE_GATEWAY_ID || "mirumee.payments.stripe"
    if (paymentMethodId?.trim()) {
      const amount = await getCheckoutTotalPrice(checkoutId)
      await checkoutPaymentCreate(checkoutId, {
        gateway: stripeGateway,
        amount,
        token: paymentMethodId.trim()
      })
    }

    const paymentData =
      paymentMethodId?.trim() ?
        JSON.stringify({ payment_method_id: paymentMethodId.trim() })
      : undefined
    const result = await checkoutComplete(checkoutId, redirectUrl, {
      metadata: metadata.length ? metadata : undefined,
      paymentData
    })

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
      const cookieStore = await cookies()
      cookieStore.set("saleor_token", authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      cookieStore.set("saleor_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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
