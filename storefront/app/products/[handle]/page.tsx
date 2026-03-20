import { getProductByHandle } from "../../../lib/vendure"
import { getPlainDescription } from "../../../lib/description"
import { buildAttributeDefinitionsFromVariants } from "../../../lib/build-attribute-definitions"
import ProductPurchase from "../../../components/ProductPurchase"

const ProductDetailPage = async ({
  params
}: {
  params: Promise<{ handle: string }>
}) => {
  const { handle } = await params
  let product: Awaited<ReturnType<typeof getProductByHandle>> = null
  try {
    product = await getProductByHandle(handle)
  } catch (err) {
    console.error("Product fetch failed:", err)
  }

  if (!product) {
    return (
      <div className="container-page py-12">
        <h1 className="text-2xl font-semibold">Product not found</h1>
      </div>
    )
  }

  const price = product?.pricing?.priceRange?.start?.gross?.amount
  const variants =
    product?.variants?.map((variant) => ({
      id: variant.id,
      name: variant.name || "Default",
      price: variant.pricing?.price?.gross?.amount,
      attributes: variant.attributes
    })) ?? []
  const attributeDefinitions = buildAttributeDefinitionsFromVariants(product?.variants)
  const description = getPlainDescription(product?.description)

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <img
          src={
            product.thumbnail?.url ||
            "https://placehold.co/800x600?text=Snack+Box"
          }
          alt={product.name}
          className="h-full w-full rounded-lg object-cover"
        />
      </div>
      <div className="space-y-6">
        <div>
          <p className="section-subtitle">Snack Boxes</p>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {product.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <ProductPurchase
          variants={variants}
          fallbackPrice={price}
          attributeDefinitions={attributeDefinitions}
        />
      </div>
    </div>
  )
}

export default ProductDetailPage
