"use client"

import Link from "next/link"
import { useCart } from "./CartContext"

const CheckoutButton = () => {
  const { cart } = useCart()
  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  const label =
    itemCount > 1
      ? `Checkout (${itemCount})`
      : itemCount === 1
        ? "Checkout (1)"
        : "Checkout"

  return (
    <Link
      href="/checkout"
      className="inline-flex max-w-full min-w-0 items-center justify-center whitespace-nowrap rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4 sm:py-2.5 sm:text-sm"
    >
      {label}
    </Link>
  )
}

export default CheckoutButton
