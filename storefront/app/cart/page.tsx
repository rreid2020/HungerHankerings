"use client"

import Link from "next/link"
import Button from "../../components/Button"
import { useCart } from "../../components/CartContext"

const formatPrice = (amount?: number) => {
  if (!amount) return "$0.00"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount)
}

/** Split "Product Name - Variant" into name and variant if present */
function parseTitle(title: string): { name: string; variant: string } {
  const i = title.lastIndexOf(" - ")
  if (i === -1) return { name: title, variant: "" }
  return { name: title.slice(0, i), variant: title.slice(i + 3) }
}

const CartPage = () => {
  const { cart, loading, updating, updateItem, removeItem, resetCartSession } = useCart()

  if (loading) {
    return <div className="container-page py-12">Loading cart...</div>
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your cart is empty.</p>
        <div className="mt-6">
          <Button href="/themed-snack-boxes">Shop Snack Boxes</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page grid min-w-0 gap-8 py-8 sm:gap-10 sm:py-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.75fr)]">
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
          <button
            type="button"
            disabled={updating}
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  "Remove all items and clear saved checkout details stored in this browser?"
                )
              ) {
                return
              }
              void resetCartSession()
            }}
            className="text-sm font-medium text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            Empty cart &amp; clear saved checkout
          </button>
        </div>
        <ul className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
          {cart.items.map((item) => {
            const { name, variant } = parseTitle(item.title)
            return (
              <li
                key={item.lineId}
                className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50 sm:h-24 sm:w-24">
                    <img
                      src={item.image ?? "https://placehold.co/96x96?text=Snack+Box"}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{name}</p>
                    {variant ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{variant}</p>
                    ) : null}
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatPrice(item.unitPrice)}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-iron_grey">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      In stock
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-3 sm:justify-start">
                  <label htmlFor={`qty-${item.lineId}`} className="sr-only">Quantity</label>
                  <input
                    id={`qty-${item.lineId}`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = Math.max(1, Math.floor(Number(e.target.value)) || 1)
                      updateItem(item.lineId, val)
                    }}
                    className="w-16 rounded-md border border-gray-300 py-2 pl-2 pr-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.lineId)}
                    aria-label={`Remove ${item.title} from cart`}
                    className="rounded p-2 text-muted-foreground hover:bg-gray-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-6 lg:sticky lg:top-4 lg:self-start">
        <h2 className="text-lg font-medium text-foreground">Order summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col gap-0.5 text-foreground sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <dt>Subtotal</dt>
            <dd className="tabular-nums sm:text-right">{formatPrice(cart.subtotal)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 text-foreground sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <dt className="flex min-w-0 flex-wrap items-center gap-1">
              Shipping estimate
              <span className="text-muted-foreground" title="Shipping calculated at checkout">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </dt>
            <dd className="tabular-nums sm:text-right">{formatPrice(cart.shippingTotal)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-gray-200 pt-3 font-medium text-foreground sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <dt>Order total</dt>
            <dd className="tabular-nums sm:text-right">{formatPrice(cart.total)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-4">
          <Link
            href="/themed-snack-boxes"
            className="text-center text-sm font-medium text-primary hover:underline"
          >
            Continue Shopping
          </Link>
          <Button href="/checkout" className="w-full px-4 py-3">
            Checkout
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CartPage
