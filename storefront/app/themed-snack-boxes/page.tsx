import ProductCard from "../../components/ProductCard"
import CheckoutButton from "../../components/CheckoutButton"
import { listProducts } from "../../lib/vendure"

export const dynamic = "force-dynamic"

const ThemedSnackBoxesPage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  try {
    products = await listProducts()
  } catch (err) {
    console.error("Products fetch failed:", err)
  }

  return (
    <div className="container-page space-y-10 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-subtitle">Themed Snack Boxes</p>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            Snack boxes for every craving
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore curated boxes with dietary tags, gifting options, and
            Canada-wide delivery.
          </p>
        </div>
        <CheckoutButton />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={(product as { id: string }).id} product={product} />
        ))}
      </div>
    </div>
  )
}

export default ThemedSnackBoxesPage
