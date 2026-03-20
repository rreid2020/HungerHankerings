"use client"

import { useMemo, useState, useEffect } from "react"
import AddToCart from "./AddToCart"
import type { StorefrontProductVariant } from "../lib/vendure"
import {
  type AttributeDefinition,
  findVariantByAttributes
} from "../lib/build-attribute-definitions"

export type VariantAttribute = {
  attribute: { name: string }
  values: { name: string }[]
}

type Variant = {
  id: string
  name: string
  price?: number
  attributes?: VariantAttribute[]
}

export type { AttributeDefinition }

type ProductPurchaseProps = {
  variants: Variant[]
  fallbackPrice?: number
  /** When set, show one selector per attribute (e.g. Size, Gift option) instead of a single variant dropdown */
  attributeDefinitions?: AttributeDefinition[]
}

const formatPrice = (amount?: number) => {
  if (!amount && amount !== 0) return ""
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format(amount)
}

const LABEL_CLASS =
  "block text-sm font-semibold text-foreground"
const SELECT_CLASS =
  "mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
/** Same as server/cached output so first paint matches during hydration */
const PLACEHOLDER_LABEL_CLASS = "text-sm font-semibold text-foreground"
const PLACEHOLDER_SELECT_CLASS =
  "mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-sm"

const ProductPurchase = ({
  variants,
  fallbackPrice,
  attributeDefinitions = []
}: ProductPurchaseProps) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const hasAttributeSelectors =
    mounted &&
    attributeDefinitions.length > 0 &&
    variants.length > 1

  const initialSelected = useMemo(() => {
    const sel: Record<string, string> = {}
    for (const def of attributeDefinitions) {
      sel[def.name] = def.values[0] ?? ""
    }
    return sel
  }, [attributeDefinitions])

  const [selectedByAttribute, setSelectedByAttribute] =
    useState<Record<string, string>>(initialSelected)
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "")

  const resolvedVariant = useMemo(() => {
    if (hasAttributeSelectors) {
      return findVariantByAttributes(
        variants as StorefrontProductVariant[],
        attributeDefinitions,
        selectedByAttribute
      ) as Variant | undefined
    }
    return variants.find((v) => v.id === selectedId)
  }, [
    hasAttributeSelectors,
    variants,
    attributeDefinitions,
    selectedByAttribute,
    selectedId
  ])

  const price = resolvedVariant?.price ?? fallbackPrice
  const effectiveVariantId = resolvedVariant?.id ?? ""

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-2 text-lg font-medium text-foreground">{formatPrice(price)}</p>
      </div>

      {!mounted && variants.length > 1 ? (
        <label className={PLACEHOLDER_LABEL_CLASS}>
          Choose a variant
          <select
            className={PLACEHOLDER_SELECT_CLASS}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
      ) : !mounted ? null : hasAttributeSelectors ? (
        <div className="space-y-3">
          {attributeDefinitions.map((def) => (
            <label key={def.name} className={LABEL_CLASS}>
              {def.name}
              <select
                className={SELECT_CLASS}
                value={selectedByAttribute[def.name] ?? ""}
                onChange={(e) =>
                  setSelectedByAttribute((prev) => ({
                    ...prev,
                    [def.name]: e.target.value
                  }))
                }
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
      ) : variants.length > 1 ? (
        <label className={LABEL_CLASS}>
          Choose a variant
          <select
            className={SELECT_CLASS}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <AddToCart variantId={effectiveVariantId} disabled={!effectiveVariantId} />
    </div>
  )
}

export default ProductPurchase
