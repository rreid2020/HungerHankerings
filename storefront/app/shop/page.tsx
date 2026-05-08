import type { Metadata } from "next"
import ProductCard from "../../components/ProductCard"
import CheckoutButton from "../../components/CheckoutButton"
import { absoluteUrl, SITE_NAME } from "../../lib/site"
import { listProducts } from "../../lib/vendure"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Shop themed snack boxes",
  description:
    "Browse Hunger Hankerings themed snack boxes—dietary tags, gifting, and Canada-wide delivery. Add to cart and checkout securely.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: `Shop themed snack boxes | ${SITE_NAME}`,
    description: "Curated snack boxes for every craving with Canada-wide delivery.",
    url: absoluteUrl("/shop")
  }
}

const ShopPage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  let catalogLoadFailed = false
  try {
    products = await listProducts()
  } catch (err) {
    catalogLoadFailed = true
    console.error("Products fetch failed:", err)
  }

  return (
    <div className="container-page space-y-10 py-8 sm:py-12">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="section-subtitle">Themed Snack Boxes</p>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
            Snack boxes for every craving
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore curated boxes with dietary tags, gifting options, and
            Canada-wide delivery.
          </p>
        </div>
        <CheckoutButton />
      </div>
      {catalogLoadFailed ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
          role="alert"
        >
          The snack catalog could not be loaded. Check runtime logs for Vendure (database SSL,
          <code className="mx-0.5 rounded bg-muted px-1 py-0.5 text-xs">VENDURE_SHOP_API_URL</code>
          →<code className="mx-0.5 rounded bg-muted px-1 py-0.5 text-xs">http://127.0.0.1:3000/shop-api</code>
          ) and see <code className="rounded bg-muted px-1 py-0.5 text-xs">deploy/APP-PLATFORM.md</code>.
        </p>
      ) : null}
      {!catalogLoadFailed && products.length === 0 ? (
        <p className="rounded-md border border-dust_grey-200 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No snack boxes are listed for the shop right now. If you recently moved databases, confirm
          products exist in Vendure Admin and each variant has a price in the active channel (CAD).
        </p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={(product as { id: string }).id} product={product} />
        ))}
      </div>
    </div>
  )
}

export default ShopPage
