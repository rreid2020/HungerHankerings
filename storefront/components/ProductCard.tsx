"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useCart } from "./CartContext"
import type { StorefrontProduct } from "../lib/vendure"
import {
  buildAttributeDefinitionsFromVariants,
  findVariantByAttributes
} from "../lib/build-attribute-definitions"

const formatPrice = (amount?: number) => {
  if (amount === undefined || amount === null) return ""
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount)
}

const ProductCard = ({ product }: { product: StorefrontProduct }) => {
  const { addItem, loading, updating } = useCart()
  const variants = useMemo(
    () => product.variants?.filter((v) => v.id) ?? [],
    [product.variants]
  )
  const firstVariant = variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    firstVariant?.id ?? null
  )
  const attributeDefinitions = useMemo(
    () => buildAttributeDefinitionsFromVariants(variants),
    [variants]
  )
  const hasOptionGroupSelectors =
    attributeDefinitions.length > 0 && variants.length > 1

  const [selectedByAttribute, setSelectedByAttribute] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    const sel: Record<string, string> = {}
    for (const def of attributeDefinitions) {
      sel[def.name] = def.values[0] ?? ""
    }
    setSelectedByAttribute(sel)
    setSelectedVariantId(firstVariant?.id ?? null)
  }, [product.id, attributeDefinitions, firstVariant?.id])

  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const resolvedVariant = useMemo(() => {
    if (hasOptionGroupSelectors) {
      return findVariantByAttributes(
        variants,
        attributeDefinitions,
        selectedByAttribute
      )
    }
    return variants.find((v) => v.id === selectedVariantId)
  }, [
    hasOptionGroupSelectors,
    variants,
    attributeDefinitions,
    selectedByAttribute,
    selectedVariantId
  ])

  const effectiveVariantId = resolvedVariant?.id ?? ""
  const price =
    resolvedVariant?.pricing?.price?.gross?.amount ??
    product.pricing?.priceRange?.start?.gross?.amount
  const outOfStock =
    resolvedVariant != null &&
    typeof resolvedVariant.quantityAvailable === "number" &&
    resolvedVariant.quantityAvailable < 1

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!effectiveVariantId) return
    setAddError(null)
    setAdding(true)
    try {
      await addItem(effectiveVariantId, quantity)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not add to cart."
      setAddError(
        /stock|remaining|out of stock/i.test(message)
          ? "This size is out of stock. Please choose another or check back later."
          : message
      )
    } finally {
      setAdding(false)
    }
  }

  const handleVariantChange = (variantId: string | null) => {
    setSelectedVariantId(variantId)
    setAddError(null)
  }

  const handleQuantityChange = (qty: number) => {
    setQuantity(qty)
    setAddError(null)
  }

  const showVariantUi = variants.length > 1

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="group flex flex-col flex-1"
      >
        <div className="aspect-[4/3] w-full bg-gray-50">
          <img
            src={
              product.thumbnail?.url ||
              "https://placehold.co/800x600?text=Snack+Box"
            }
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:opacity-95"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-base font-semibold text-foreground">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{formatPrice(price)}</p>
        </div>
      </Link>
      <div className="border-t border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
        {variants.length === 0 ? (
          <Link
            href={`/products/${product.slug}`}
            className="inline-block text-sm font-medium text-foreground hover:text-muted-foreground"
          >
            View Details
          </Link>
        ) : (
          <>
            {hasOptionGroupSelectors ? (
              <div className="space-y-2">
                {attributeDefinitions.map((def) => (
                  <label key={def.name} className="block text-xs font-medium text-foreground">
                    {def.name}
                    <select
                      value={selectedByAttribute[def.name] ?? ""}
                      onChange={(e) =>
                        setSelectedByAttribute((prev) => ({
                          ...prev,
                          [def.name]: e.target.value
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {def.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : showVariantUi ? (
              <>
                <label className="block text-xs font-medium text-foreground">
                  Options
                </label>
                <select
                  value={selectedVariantId ?? ""}
                  onChange={(e) => handleVariantChange(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select</option>
                  {variants.map((v) => {
                    const stock = v.quantityAvailable
                    const isOut = typeof stock === "number" && stock < 1
                    return (
                      <option key={v.id} value={v.id} disabled={isOut}>
                        {v.name}
                        {v.pricing?.price?.gross?.amount != null
                          ? ` — ${formatPrice(v.pricing.price.gross.amount)}`
                          : ""}
                        {isOut ? " (Out of stock)" : ""}
                      </option>
                    )
                  })}
                </select>
              </>
            ) : null}
            {outOfStock && (
              <p className="mt-2 text-sm font-medium text-light_coral-600">
                Out of stock
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {showVariantUi ? (
                <label className="sr-only">Quantity</label>
              ) : null}
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(99, Math.floor(Number(e.target.value)) || 1))
                  handleQuantityChange(v)
                }}
                className="w-16 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={outOfStock}
              />
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={
                  !effectiveVariantId || loading || updating || adding || outOfStock
                }
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {adding || updating ? "Adding…" : outOfStock ? "Out of stock" : "Add to Cart"}
              </button>
            </div>
            {addError && (
              <p className="mt-2 text-sm text-light_coral-600" role="alert">
                {addError}
              </p>
            )}
            <Link
              href={`/products/${product.slug}`}
              className="mt-2 block text-center text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              View Details
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default ProductCard
