"use client"

import Link from "next/link"
import { useCart } from "./CartContext"

const CartButton = () => {
  const { cart } = useCart()
  const count = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
  const subtotal = cart?.subtotal ?? 0

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Shopping cart${count > 0 ? ` with ${count} item${count > 1 ? "s" : ""}` : ""}`}
    >
      {/* Shopping bag icon */}
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      
      {/* Price displayed next to icon */}
      {subtotal > 0 && (
        <span className="text-sm font-medium">
          ${subtotal.toFixed(2)}
        </span>
      )}

      {/* Badge with item count */}
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  )
}

export default CartButton
