"use client"

import { useEffect, useRef } from "react"
import { captureEvent } from "../lib/analytics"

type ProductViewTrackerProps = {
  productId: string
  productName: string
  productSlug: string
  price?: number
}

export default function ProductViewTracker({
  productId,
  productName,
  productSlug,
  price,
}: ProductViewTrackerProps) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true
    captureEvent("view_product", {
      product_id: productId,
      product_name: productName,
      product_slug: productSlug,
      price: price ?? null,
    })
  }, [price, productId, productName, productSlug])

  return null
}
