import type { StorefrontProductVariant } from "./vendure"

export type AttributeDefinition = {
  name: string
  values: string[]
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
    values: Array.from(byName.get(name) ?? [])
  }))
}

export function variantHasAttributeValue(
  variant: StorefrontProductVariant,
  attributeName: string,
  valueName: string
): boolean {
  const attr = variant.attributes?.find((a) => a.attribute.name === attributeName)
  return attr?.values.some((v) => v.name === valueName) ?? false
}

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
