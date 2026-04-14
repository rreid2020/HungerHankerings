import type { Metadata } from "next"
import ProductCard from "../../components/ProductCard"
import { listProducts } from "../../lib/vendure"
import Button from "../../components/Button"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gift a snack box",
  description:
    "Send a curated Hunger Hankerings snack box—great for teams, clients, and loved ones with Canada-wide delivery.",
  alternates: { canonical: "/gift-a-box" },
  openGraph: {
    title: `Gift a snack box | ${SITE_NAME}`,
    description: "Celebrate with a curated snack box surprise.",
    url: absoluteUrl("/gift-a-box")
  }
}

const GiftABoxPage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  try {
    products = await listProducts()
  } catch (err) {
    console.error("Products fetch failed:", err)
  }

  return (
    <div className="container-page space-y-10 py-8 sm:py-12">
      <div className="rounded-lg border border-dust_grey-200 bg-ash_grey-100 p-4 sm:p-8 md:p-10">
        <p className="section-subtitle">Gift A Box</p>
        <h1 className="text-2xl font-semibold text-iron_grey sm:text-3xl">
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
