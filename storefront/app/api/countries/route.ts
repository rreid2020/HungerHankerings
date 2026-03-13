import { NextResponse } from "next/server"
import { getAvailableCountries } from "../../../lib/vendure"

/**
 * GET /api/countries
 * Returns countries from Vendure (available in the active channel's zones).
 * Used to populate country dropdowns on checkout and address forms.
 */
export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") ?? undefined
    const countries = await getAvailableCountries({ cookie })
    return NextResponse.json(countries)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load countries"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
