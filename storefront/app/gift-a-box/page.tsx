import ProductCard from "../../components/ProductCard"
import { listProducts } from "../../lib/vendure"
import Button from "../../components/Button"

export const dynamic = "force-dynamic"

const GiftABoxPage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  try {
    products = await listProducts()
  } catch (err) {
    console.error("Saleor products fetch failed:", err)
  }

  return (
    <div className="container-page space-y-10 py-12">
      <div className="rounded-lg border border-dust_grey-200 bg-ash_grey-100 p-10">
        <p className="section-subtitle">Gift A Box</p>
        <h1 className="text-3xl font-semibold text-iron_grey">
          Send a snack box surprise
        </h1>
        <p className="mt-3 text-sm text-iron_grey">
          Celebrate teams, clients, or loved ones with a curated snack box.
        </p>
        <div className="mt-6">
          <Button href="/contact" variant="secondary">
            Build a custom gift
          </Button>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-iron_grey">
          Gift-ready snack boxes
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={(product as { id: string }).id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default GiftABoxPage
