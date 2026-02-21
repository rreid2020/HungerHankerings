import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "../../../../lib/auth"
import { accountUpdate } from "../../../../lib/saleor"

/** PATCH: update profile (firstName, lastName) */
export async function PATCH(request: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : ""
    const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : ""
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      )
    }
    const result = await accountUpdate(token, { firstName, lastName })
    if (result.errors?.length) {
      return NextResponse.json(
        { error: result.errors[0].message ?? "Failed to update profile" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update profile"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
