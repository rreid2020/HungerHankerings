import { redirect } from "next/navigation"
import { getAuthUser, getAuthToken } from "../../../lib/auth"
import { getCurrentCustomer } from "../../../lib/saleor"
import AddressesClient from "./AddressesClient"

export default async function AddressesPage() {
  const { user, hasToken } = await getAuthUser()

  if (!hasToken) {
    redirect("/login?redirect=/account/addresses")
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Couldn't load your account.</p>
        <p className="mt-1 text-sm">Please refresh the page or try again later.</p>
      </div>
    )
  }

  const token = await getAuthToken()
  const customer = token ? await getCurrentCustomer(token) : null
  const addresses = customer?.addresses || []

  return <AddressesClient addresses={addresses} />
}
