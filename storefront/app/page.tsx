import type { Metadata } from "next"
import Button from "../components/Button"
import ProductCard from "../components/ProductCard"
import {
  getHomeFeaturedCollectionSlug,
  listProducts,
  listProductsInCollectionBySlug,
} from "../lib/vendure"
import { contactQuoteHref } from "../lib/contact-inquiry"
import { SITE_NAME, absoluteUrl } from "../lib/site"

// Fetch uses no-store (dynamic); avoid static generation at build when API is unavailable
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Canada’s #1 Snack Box | Healthy, Fun & Office Snack Delivery",
  description:
    "Discover Canada’s top-rated snack boxes—no subscription. Healthy snack boxes, office snack delivery, and gift boxes shipped across Canada. Order curated snacks anytime.",
  keywords: [
    "snack box Canada",
    "buy snack boxes online Canada",
    "healthy snack boxes Canada",
    "office snack delivery Canada",
    "snack gift boxes Canada",
    "bulk snack boxes Canada"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — Canada’s #1 snack box (healthy, office & gifts)`,
    description:
      "Curated snack boxes across Canada—no subscription. Healthy options, office programs, themed gifts, and bulk orders.",
    url: absoluteUrl("/")
  }
}

const HomePage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  try {
    products = await listProducts()
  } catch (err) {
    console.error("Products fetch failed:", err)
  }

  let snackBoxFavorites = products.slice(0, 3)
  try {
    const fromCollection = await listProductsInCollectionBySlug(
      getHomeFeaturedCollectionSlug()
    )
    if (fromCollection.length > 0) {
      snackBoxFavorites = fromCollection
    }
  } catch (err) {
    console.error("Featured snack boxes collection fetch failed:", err)
  }

  return (
    <div className="space-y-24 pb-24">
      <section className="bg-gradient-to-b from-powder_petal-50 via-powder_petal-50 to-powder_petal-50/30">
        <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-12 sm:px-6 lg:max-w-[90rem] lg:px-8 lg:py-14 xl:px-10">
          <header className="mb-6 max-w-5xl space-y-3 lg:mb-8">
            <p className="section-subtitle">Hunger Hankerings</p>
            <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-iron_grey sm:text-4xl md:text-[2.25rem] lg:text-[2.65rem] xl:text-5xl">
              Canada&apos;s #1 Snack Box | Healthy, Fun &amp; Office Snack Delivery
            </h1>
            <p className="text-pretty max-w-3xl text-base font-medium leading-snug text-iron_grey md:text-lg">
              Discover Canada&apos;s top-rated snack boxes — no subscription required, just great
              snacks delivered when you want them.
            </p>
          </header>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1.12fr)] lg:items-start lg:gap-6 xl:gap-8">
            <div className="min-w-0 space-y-3 rounded-2xl border border-dust_grey-200/70 bg-white/60 px-4 py-4 text-sm leading-snug text-iron_grey shadow-sm backdrop-blur-sm sm:px-5 sm:py-5 md:text-[0.9375rem] md:leading-relaxed">
              <p>
                <span className="font-semibold text-iron_grey">Hey fellow snacker</span> 👋
                <br />
                <span className="text-iron_grey/95">Welcome to Canada&apos;s #1 snack box experience.</span>
              </p>
              <p className="font-medium text-iron_grey">Whether you&apos;re a:</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:gap-x-6">
                {[
                  "Mindless muncher",
                  "On-the-go grazer",
                  "Health-conscious snacker",
                  "Late-night foodie"
                ].map((label) => (
                  <li key={label} className="flex items-start gap-2.5 text-iron_grey">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cherry_blossom"
                      aria-hidden
                    />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-h-0 min-w-0">
              <div className="rounded-2xl border border-dust_grey-200/80 bg-white/90 p-4 shadow-md ring-1 ring-black/[0.04] sm:p-5">
                <h2 className="text-sm font-semibold tracking-tight text-iron_grey sm:text-base md:text-lg">
                  Why Hunger Hankerings is Canada&apos;s #1 Snack Box
                </h2>
                <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 text-xs text-iron_grey sm:grid-cols-2 sm:text-sm">
                  {[
                    "No subscription — order anytime, hassle-free",
                    "Curated snack boxes for individuals & businesses",
                    "Fast delivery anywhere in Canada 🇨🇦",
                    "High-quality, handpicked snacks",
                    "Perfect for gifting, offices, or personal cravings"
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cherry_blossom/15 text-[10px] font-bold text-cherry_blossom sm:h-5 sm:w-5 sm:text-xs"
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="leading-snug">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative min-w-0 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-dust_grey-200/80 bg-gradient-to-b from-powder_petal-100/80 to-white p-1.5 shadow-lg ring-1 ring-black/[0.06] sm:p-2">
                <div className="overflow-hidden rounded-xl bg-white/90">
                  <img
                    src="/hero-snack-box.png"
                    alt="Curated snack boxes filled with chips, crackers, fruit, and treats"
                    className="h-auto w-full max-h-[220px] object-contain object-center sm:max-h-[260px] md:max-h-[300px] lg:max-h-[min(52vw,420px)] xl:max-h-[440px]"
                    style={{
                      filter: "saturate(0.95) contrast(1.03)",
                      transform: "scale(1.18)"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-dust_grey-200/60 pt-6 lg:mt-8 lg:pt-8">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-iron_grey/55 sm:text-[11px]">
              Shop &amp; corporate programs
            </p>
            <nav
              aria-label="Shop and workplace programs"
              className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3"
            >
              <Button
                href="/shop"
                className="min-h-11 w-full shrink-0 justify-center rounded-xl px-6 text-sm font-semibold shadow-md transition hover:shadow-lg sm:w-auto sm:min-h-12 sm:px-8 sm:text-base"
              >
                Shop snack boxes
              </Button>
              <Button
                href="/corporate/team-snack-boxes"
                variant="ghost"
                className="min-h-11 flex-1 justify-center rounded-lg border border-dust_grey-200 bg-white px-3 text-center text-xs font-semibold text-iron_grey shadow-none hover:border-primary/40 hover:bg-powder_petal-50/80 sm:flex-initial sm:min-h-12 sm:px-5 sm:text-sm"
              >
                Team snack boxes
              </Button>
              <Button
                href="/corporate/office-snack-pantry"
                variant="ghost"
                className="min-h-11 flex-1 justify-center rounded-lg border border-dust_grey-200 bg-white px-3 text-center text-xs font-semibold text-iron_grey shadow-none hover:border-primary/40 hover:bg-powder_petal-50/80 sm:flex-initial sm:min-h-12 sm:px-5 sm:text-sm"
              >
                Office pantry
              </Button>
              <Button
                href="/corporate/bulk-pallet"
                variant="ghost"
                className="min-h-11 flex-1 justify-center rounded-lg border border-dust_grey-200 bg-white px-3 text-center text-xs font-semibold text-iron_grey shadow-none hover:border-primary/40 hover:bg-powder_petal-50/80 sm:flex-initial sm:min-h-12 sm:px-5 sm:text-sm"
              >
                Bulk &amp; pallet
              </Button>
            </nav>
            <p className="mt-4 text-center text-xs font-medium leading-relaxed text-iron_grey/75 sm:text-sm">
              No subscription. No commitment. Just amazing snacks.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 rounded-lg border border-dust_grey-200 bg-ash_grey-100 p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="rounded-lg border border-dust_grey-200 bg-white p-4 shadow-sm">
            <img
              src="/illustration-team-snack-boxes.svg"
              alt="Stylized gift boxes and delivery routes suggesting team snack gifting"
              className="h-full min-h-[200px] w-full rounded-lg object-contain object-center p-2 sm:min-h-[260px]"
              width={800}
              height={520}
            />
          </div>
          <div>
            <p className="section-subtitle text-iron_grey">Team Snack Boxes</p>
            <h2 className="section-title text-iron_grey">Team Snack Boxes Delivered Anywhere in Canada</h2>
            <p className="mt-3 text-sm text-iron_grey">
              Make team gifting effortless with curated snack boxes your employees and clients will
              actually enjoy—from onboarding and milestones to client thank-yous.
            </p>
            <p className="mt-3 text-sm text-iron_grey">
              We handle sourcing, packing, and Canada-wide delivery so your team gets a memorable
              experience, whether they&apos;re at home or in the office.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/corporate/team-snack-boxes" variant="secondary">
                Learn More
              </Button>
              <Button href={contactQuoteHref("team-snack-boxes")} variant="ghost">
                Request a Custom Quote
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 rounded-lg border border-dust_grey-200 bg-ash_grey-100 p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="section-subtitle text-iron_grey">Office Pantry</p>
            <h2 className="section-title text-iron_grey">Office Pantry Snack Service</h2>
            <p className="mt-3 text-sm text-iron_grey">
              Easy access to healthy options does more than feed your office; it feeds your culture. With tasty options onsite, it gives colleagues a chance to connect and it saves them time by not needing to leave the office for food.
            </p>
            <p className="mt-3 text-sm text-iron_grey">
              Offering a subsidized office snack program creates an inspiring break room space, causing your team to love where they work.
            </p>
            <div className="mt-6">
              <Button href="/office-pantry-snack-service" variant="secondary">
                Learn More
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-dust_grey-200 bg-white p-4 shadow-sm">
            <img
              src="/office-pantry.png"
              alt="Modern office pantry with coffee station, snacks, and seating"
              className="h-full w-full rounded-lg object-cover"
            />
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="grid gap-10 rounded-lg border border-dust_grey-200 bg-ash_grey-100 p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="section-subtitle text-iron_grey">Bulk &amp; Pallet</p>
            <h2 className="section-title text-iron_grey">Bulk &amp; Pallet Snack Box Service</h2>
            <p className="mt-3 text-sm text-iron_grey">
              Built for high-volume, fully customized snack box orders—delivered to a central
              location on pallets or in coordinated shipments. Choose box sizes, snack profiles,
              and branding so every unit matches your campaign or internal rollout.
            </p>
            <p className="mt-3 text-sm text-iron_grey">
              We plan production and packing around your receiving windows, whether you&apos;re
              staging a national program, stocking distribution hubs, or supporting franchise
              rollouts across Canada.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/corporate/bulk-pallet" variant="secondary">
                Learn More
              </Button>
              <Button href={contactQuoteHref("bulk-pallet")} variant="ghost">
                Request a Custom Quote
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-dust_grey-200 bg-white p-4 shadow-sm">
            <img
              src="/illustration-bulk-pallet.svg"
              alt="Stylized stacked shipping cartons on a pallet for high-volume orders"
              className="h-full min-h-[200px] w-full rounded-lg object-contain object-center p-2 sm:min-h-[260px]"
              width={800}
              height={520}
            />
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="mb-10 text-center">
          <p className="section-subtitle">Our Boxes</p>
          <h2 className="section-title">Snack box favorites</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-iron_grey">
            A vast selection of shareable and individual size snacks, beverages, and more! Select from the following boxes.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {snackBoxFavorites.map((product) => (
            <ProductCard key={(product as { id: string }).id} product={product} />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button href="/themed-snack-boxes" variant="ghost">
            View All Snack Boxes
          </Button>
        </div>
      </section>

      <section className="container-page">
        <div className="rounded-lg border border-ash_grey-500 bg-ash_grey-500 px-10 py-12 text-white">
          <div className="mb-10 text-center">
            <p className="section-subtitle text-ash_grey-100">
              Corporate Client Testimonials
            </p>
            <h2 className="text-3xl font-semibold">Teams love Hunger Hankerings</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              "The snacks were curated perfectly and the delivery was seamless.",
              "A fun way to celebrate the team with a box everyone enjoyed.",
              "Quick setup and consistent quality every single shipment."
            ].map((quote) => (
              <div key={quote} className="rounded-lg border border-ash_grey-500 bg-ash_grey-500/60 p-6">
                <p className="text-sm text-ash_grey-100">“{quote}”</p>
                <p className="mt-4 text-sm font-semibold text-white">
                  Corporate Client, Canada
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="rounded-lg border border-dust_grey-200 bg-powder_petal-50 p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-subtitle">FAQ</p>
              <h2 className="section-title">Have questions?</h2>
              <p className="mt-2 text-sm text-iron_grey">
                Explore shipping timelines, dietary options, and more.
              </p>
            </div>
            <Button href="/faqs" variant="secondary">
              Read FAQs
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page">
        <div className="rounded-lg border border-cherry_blossom-200 bg-cherry_blossom px-8 py-12 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-subtitle text-cherry_blossom-50">Contact Us</p>
              <h2 className="text-3xl font-semibold">
                Ready to snack smarter?
              </h2>
              <p className="mt-2 text-sm text-cherry_blossom-50">
                Tell us about your team and we will build a custom snack plan.
              </p>
            </div>
            <Button href={contactQuoteHref("general")} variant="primary">
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
