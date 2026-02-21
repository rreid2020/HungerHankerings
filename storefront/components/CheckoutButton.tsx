"use client"

import Link from "next/link"
import { useCart } from "./CartContext"

const CheckoutButton = () => {
  const { cart } = useCart()
  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <Link
      href="/checkout"
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {itemCount > 0 ? `Checkout${itemCount > 1 ? ` (${itemCount} items)` : ""}` : "Checkout"}
    </Link>
  )
}

export default CheckoutButton
