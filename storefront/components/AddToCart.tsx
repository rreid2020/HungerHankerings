"use client"

import { useState } from "react"
import Button from "./Button"
import { useCart } from "./CartContext"

type AddToCartProps = {
  variantId: string
  quantity?: number
  disabled?: boolean
}

const AddToCart = ({ variantId, quantity = 1, disabled }: AddToCartProps) => {
  const { addItem, loading, updating } = useCart()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <Button
        type="button"
        disabled={disabled || loading || updating}
        onClick={async () => {
          setError(null)
          try {
            await addItem(variantId, quantity)
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Could not add to cart."
            setError(
              /stock|remaining|out of stock/i.test(message)
                ? "This item is out of stock. Please choose another or check back later."
                : message
            )
          }
        }}
      >
        {updating ? "Adding..." : "Add to Cart"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-light_coral-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default AddToCart
