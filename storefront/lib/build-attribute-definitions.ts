import type { StorefrontProductVariant } from "./vendure"

export type AttributeDefinition = {
  name: string
  values: string[]
}

/**
 * Option groups treated as checkout-only add-ons (not shown on PDP / product cards).
 * Gift wrap + fee is selected at checkout; catalog stays size-only from the shopper’s view.
 */
export function isCheckoutOnlyGiftOptionGroup(groupName: string): boolean {
  return /gift|wrap|card/i.test(groupName)
}

function sortValuesForDisplay(groupName: string, values: string[]): string[] {
  const arr = [...values]
  if (isCheckoutOnlyGiftOptionGroup(groupName)) {
    return arr.sort((a, b) => {
      const aNo = /^(no|none)\b/i.test(a.trim())
      const bNo = /^(no|none)\b/i.test(b.trim())
      if (aNo && !bNo) return -1
      if (!aNo && bNo) return 1
      return a.localeCompare(b, undefined, { sensitivity: "base" })
    })
  }
  // Size and other groups: keep first-seen order (Set insertion / variant walk order)
  return arr
}

/**
 * Default selection per group: gift-like → "No" or "None" if listed; else first value.
 */
export function defaultSelectedForDefinition(def: AttributeDefinition): string {
  if (isCheckoutOnlyGiftOptionGroup(def.name)) {
    const no = def.values.find((v) => /^(no|none)\b/i.test(v.trim()))
    if (no) return no
  }
  return def.values[0] ?? ""
}

export function getDefaultSelectedByAttribute(
  definitions: AttributeDefinition[]
): Record<string, string> {
  const sel: Record<string, string> = {}
  for (const def of definitions) {
    sel[def.name] = defaultSelectedForDefinition(def)
  }
  return sel
}

/**
 * One dropdown per Vendure option group (e.g. "size" + "Gift packaging"),
 * same shape as ProductPurchase expects.
 */
export function buildAttributeDefinitionsFromVariants(
  variants: StorefrontProductVariant[] | undefined
): AttributeDefinition[] {
  if (!variants?.length) return []
  const byName = new Map<string, Set<string>>()
  const order: string[] = []
  for (const v of variants) {
    for (const a of v.attributes ?? []) {
      const name = a.attribute?.name
      if (!name) continue
      if (!byName.has(name)) {
        byName.set(name, new Set())
        order.push(name)
      }
      for (const val of a.values ?? []) {
        if (val?.name) byName.get(name)!.add(val.name)
      }
    }
  }
  return order.map((name) => ({
    name,
    values: sortValuesForDisplay(name, Array.from(byName.get(name) ?? []))
  }))
}

/**
 * Groups shown on the storefront catalog (excludes gift add-on; use checkout for that).
 */
export function buildCatalogAttributeDefinitions(
  variants: StorefrontProductVariant[] | undefined
): AttributeDefinition[] {
  return buildAttributeDefinitionsFromVariants(variants).filter(
    (def) => !isCheckoutOnlyGiftOptionGroup(def.name)
  )
}

function variantUnitGross(variant: StorefrontProductVariant): number {
  return variant.pricing?.price?.gross?.amount ?? Number.POSITIVE_INFINITY
}

/**
 * Match visible option selections. If Vendure still has gift×size variants, several rows
 * may match one size — pick the cheapest (typically “no gift” / base price).
 */
export function findVariantForCatalogSelection(
  variants: StorefrontProductVariant[],
  catalogDefinitions: AttributeDefinition[],
  selectedByAttribute: Record<string, string>
): StorefrontProductVariant | undefined {
  if (!variants.length) return undefined
  if (catalogDefinitions.length === 0) {
    return variants.length === 1 ? variants[0] : pickCheapestVariant(variants)
  }
  const matching = variants.filter((v) =>
    catalogDefinitions.every((def) =>
      variantHasAttributeValue(v, def.name, selectedByAttribute[def.name] ?? "")
    )
  )
  if (matching.length === 0) return undefined
  if (matching.length === 1) return matching[0]
  return pickCheapestVariant(matching)
}

function pickCheapestVariant(
  variants: StorefrontProductVariant[]
): StorefrontProductVariant {
  return variants.reduce((best, v) =>
    variantUnitGross(v) < variantUnitGross(best) ? v : best
  )
}

export function variantHasAttributeValue(
  variant: StorefrontProductVariant,
  attributeName: string,
  valueName: string
): boolean {
  const attr = variant.attributes?.find((a) => a.attribute.name === attributeName)
  return attr?.values.some((v) => v.name === valueName) ?? false
}

/** Exact match on all given attribute defs (internal / non-catalog use). */
export function findVariantByAttributes(
  variants: StorefrontProductVariant[],
  attributeDefinitions: AttributeDefinition[],
  selectedByAttribute: Record<string, string>
): StorefrontProductVariant | undefined {
  return variants.find((v) =>
    attributeDefinitions.every((def) =>
      variantHasAttributeValue(v, def.name, selectedByAttribute[def.name] ?? "")
    )
  )
}
