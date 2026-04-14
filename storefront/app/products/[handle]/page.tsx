import { cache } from "react"
import type { Metadata } from "next"
import JsonLd from "../../../components/JsonLd"
import ProductPurchase from "../../../components/ProductPurchase"
import ProductRichDescription from "../../../components/ProductRichDescription"
import { buildCatalogAttributeDefinitions } from "../../../lib/build-attribute-definitions"
import { stripHtml } from "../../../lib/html"
import { breadcrumbListJsonLd, productJsonLd } from "../../../lib/schema-org"
import { absoluteUrl, SITE_NAME } from "../../../lib/site"
import { getProductByHandle } from "../../../lib/vendure"

const getProductCached = cache(async (handle: string) => {
  try {
    return await getProductByHandle(handle)
  } catch {
    return null
  }
})

export async function generateMetadata({
  params
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductCached(handle)
  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: true } }
  }
  const descSource =
    stripHtml(product.description ?? "") ||
    `${product.name} — curated snack box from ${SITE_NAME}. Canada-wide delivery.`
  const description = descSource.length > 160 ? `${descSource.slice(0, 157)}…` : descSource
  const canonical = `/products/${encodeURIComponent(product.slug)}`
  const image = product.thumbnail?.url ?? undefined

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description: descSource.length > 200 ? `${descSource.slice(0, 197)}…` : descSource,
      url: absoluteUrl(canonical),
      type: "website",
      ...(image ? { images: [{ url: image }] } : {})
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(image ? { images: [image] } : {})
    }
  }
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProductCached(handle)

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
  const attributeDefinitions = buildCatalogAttributeDefinitions(product?.variants)

  const canonicalPath = `/products/${encodeURIComponent(product.slug)}`
  const pageUrl = absoluteUrl(canonicalPath)
  const descPlain =
    stripHtml(product.description ?? "") || `${product.name} from ${SITE_NAME}.`

  const prices = (product.variants ?? [])
    .map((v) => v.pricing?.price?.gross?.amount)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  const lowPrice =
    prices.length > 0 ? Math.min(...prices) : product.pricing?.priceRange?.start?.gross?.amount ?? 0
  const highPrice =
    prices.length > 0 ? Math.max(...prices) : product.pricing?.priceRange?.start?.gross?.amount ?? lowPrice
  const currency =
    product.variants?.find((v) => v.pricing?.price?.gross?.currency)?.pricing?.price?.gross
      ?.currency ?? "CAD"
  const offerCount = Math.max(1, product.variants?.length ?? 1)

  const productLd = productJsonLd({
    name: product.name,
    description: descPlain.slice(0, 5000),
    url: pageUrl,
    sku: product.variants?.[0]?.id,
    imageUrls: product.thumbnail?.url ? [product.thumbnail.url] : [],
    currency,
    lowPrice,
    highPrice,
    offerCount,
    brandName: SITE_NAME
  })

  const breadcrumbLd = breadcrumbListJsonLd([
    { name: "Home", item: absoluteUrl("/") },
    { name: "Shop", item: absoluteUrl("/shop") },
    { name: product.name, item: pageUrl }
  ])

  return (
    <>
      <JsonLd data={productLd} id="ld-product" />
      <JsonLd data={breadcrumbLd} id="ld-breadcrumb-product" />
      <div className="container-page grid min-w-0 gap-8 py-8 sm:gap-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            <img
              src={
                product.thumbnail?.url ||
                "https://placehold.co/800x800?text=Snack+Box"
              }
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {product.name}
            </h1>
          </div>
          <ProductRichDescription description={product.description} />
          <ProductPurchase
            variants={variants}
            fallbackPrice={price}
            attributeDefinitions={attributeDefinitions}
          />
        </div>
      </div>
    </>
  )
}
