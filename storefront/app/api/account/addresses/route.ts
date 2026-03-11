import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "../../../../lib/auth"
import { accountAddressCreate } from "../../../../lib/vendure"
import type { SaleorAddressInput } from "../../../../lib/vendure"

function parseBody(body: unknown): (SaleorAddressInput & { setAsDefaultShipping?: boolean; setAsDefaultBilling?: boolean }) | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const firstName = typeof b.firstName === "string" ? b.firstName.trim() : ""
  const lastName = typeof b.lastName === "string" ? b.lastName.trim() : ""
  const streetAddress1 = typeof b.streetAddress1 === "string" ? b.streetAddress1.trim() : ""
  const city = typeof b.city === "string" ? b.city.trim() : ""
  const postalCode = typeof b.postalCode === "string" ? b.postalCode.trim() : ""
  const country = typeof b.country === "string" ? b.country.trim() || "CA" : "CA"
  if (!firstName || !lastName || !streetAddress1 || !city || !postalCode) return null
  return {
    firstName,
    lastName,
    streetAddress1,
    streetAddress2: typeof b.streetAddress2 === "string" ? b.streetAddress2.trim() || null : null,
    city,
    postalCode,
    country,
    countryArea: typeof b.countryArea === "string" ? b.countryArea.trim() || null : null,
    phone: typeof b.phone === "string" ? b.phone.trim() || null : null,
    setAsDefaultShipping: b.setAsDefaultShipping === true,
    setAsDefaultBilling: b.setAsDefaultBilling === true
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    const parsed = parseBody(body)
    if (!parsed) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, streetAddress1, city, postalCode, country" },
        { status: 400 }
      )
    }
    const { setAsDefaultShipping, setAsDefaultBilling, ...input } = parsed
    const type = setAsDefaultShipping && setAsDefaultBilling ? undefined : setAsDefaultShipping ? "SHIPPING" : setAsDefaultBilling ? "BILLING" : undefined
    const result = await accountAddressCreate(token, input, type)
    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message ?? "Failed to create address" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true, addressId: result.addressId })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create address"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
