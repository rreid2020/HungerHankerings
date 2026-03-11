import { NextResponse } from "next/server"
import { getAuthToken } from "../../../../lib/auth"
import { getCurrentCustomer } from "../../../../lib/vendure"

/** Shape expected by checkout page (billing/shipping form state) */
export type CheckoutAddressPayload = {
  first_name: string
  last_name: string
  email: string
  address_1: string
  city: string
  province: string
  postal_code: string
  country: string
}

function saleorAddressToCheckout(
  addr: {
    firstName: string
    lastName: string
    streetAddress1: string
    city: string
    postalCode: string
    country: { code: string }
    countryArea?: string | null
  },
  email: string
): CheckoutAddressPayload {
  return {
    first_name: addr.firstName ?? "",
    last_name: addr.lastName ?? "",
    email,
    address_1: addr.streetAddress1 ?? "",
    city: addr.city ?? "",
    province: addr.countryArea ?? "",
    postal_code: addr.postalCode ?? "",
    country: addr.country?.code ?? "CA"
  }
}

/**
 * GET /api/checkout/addresses
 * Returns the logged-in user's default billing and shipping addresses for pre-filling checkout.
 * Returns nulls when not logged in or when the user has no saved addresses.
 */
export async function GET() {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({
        email: null,
        billing: null,
        shipping: null
      })
    }

    const customer = await getCurrentCustomer(token)
    if (!customer?.email) {
      return NextResponse.json({
        email: null,
        billing: null,
        shipping: null
      })
    }

    const addresses = customer.addresses ?? []
    const defaultBilling = addresses.find((a) => a.isDefaultBillingAddress) ?? addresses[0]
    const defaultShipping = addresses.find((a) => a.isDefaultShippingAddress) ?? addresses[0] ?? defaultBilling

    // When user has no default billing but has a (default) shipping address, use it for billing too so both pre-fill
    const billingAddress = defaultBilling ?? defaultShipping
    const billing = billingAddress
      ? saleorAddressToCheckout(billingAddress, customer.email)
      : null
    const shipping = defaultShipping
      ? saleorAddressToCheckout(defaultShipping, customer.email)
      : null

    return NextResponse.json({
      email: customer.email,
      billing,
      shipping
    })
  } catch {
    return NextResponse.json({
      email: null,
      billing: null,
      shipping: null
    })
  }
}
