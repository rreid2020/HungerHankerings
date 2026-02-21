import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "../../../../../lib/auth"
import { accountAddressUpdate, accountAddressDelete } from "../../../../../lib/saleor"
import type { SaleorAddressInput } from "../../../../../lib/saleor"

function parseBody(body: unknown): SaleorAddressInput | null {
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
    phone: typeof b.phone === "string" ? b.phone.trim() || null : null
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: "Address ID required" }, { status: 400 })
    const body = await request.json()
    const input = parseBody(body)
    if (!input) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, streetAddress1, city, postalCode, country" },
        { status: 400 }
      )
    }
    const result = await accountAddressUpdate(token, id, input)
    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message ?? "Failed to update address" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update address"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: "Address ID required" }, { status: 400 })
    const result = await accountAddressDelete(token, id)
    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message ?? "Failed to delete address" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete address"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
