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
        <div className="container-page py-20">
          <header className="mx-auto mb-10 max-w-4xl space-y-4 lg:mb-12">
            <p className="section-subtitle">Hunger Hankerings</p>
            <h1 className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-iron_grey sm:text-4xl md:text-[2.35rem] lg:text-5xl">
              Canada&apos;s #1 Snack Box | Healthy, Fun &amp; Office Snack Delivery
            </h1>
            <p className="text-pretty text-lg font-medium leading-snug text-iron_grey md:text-xl">
              Discover Canada&apos;s top-rated snack boxes — no subscription required, just great
              snacks delivered when you want them.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-8">
            <div className="min-w-0 space-y-4 rounded-2xl border border-dust_grey-200/70 bg-white/60 px-5 py-5 text-sm leading-relaxed text-iron_grey shadow-sm backdrop-blur-sm sm:px-6 sm:py-6 md:text-base lg:flex lg:flex-col lg:justify-between">
              <p>
                <span className="font-semibold text-iron_grey">Hey fellow snacker</span> 👋
                <br />
                <span className="text-iron_grey/95">Welcome to Canada&apos;s #1 snack box experience.</span>
              </p>
              <p className="font-medium text-iron_grey">Whether you&apos;re a:</p>
              <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-1 xl:grid-cols-2">
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
              <p className="text-iron_grey/95">
                We&apos;ve got the perfect box for you — no commitments, no subscriptions.
              </p>
              <p className="font-medium text-iron_grey">At Hunger Hankerings, we offer:</p>
              <ul className="space-y-2.5 border-t border-dust_grey-200/60 pt-4">
                <li className="flex gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>
                    🥗
                  </span>
                  <span>Healthy snack boxes for guilt-free enjoyment</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>
                    🏢
                  </span>
                  <span>Office snack boxes to keep your team energized</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>
                    🎁
                  </span>
                  <span>Themed snack gift boxes for every occasion</span>
                </li>
              </ul>
              <p className="border-t border-dust_grey-200/60 pt-4 text-iron_grey/95">
                Order anytime and enjoy premium, curated snacks delivered across Canada.
              </p>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-6">
              <div className="rounded-2xl border border-dust_grey-200/80 bg-white/90 p-5 shadow-md ring-1 ring-black/[0.04] sm:p-6 md:p-7">
                <h2 className="text-base font-semibold tracking-tight text-iron_grey md:text-lg">
                  Why Hunger Hankerings is Canada&apos;s #1 Snack Box
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-iron_grey sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 md:text-[0.9375rem]">
                {[
                  "No subscription — order anytime, hassle-free",
                  "Curated snack boxes for individuals & businesses",
                  "Fast delivery anywhere in Canada 🇨🇦",
                  "High-quality, handpicked snacks",
                  "Perfect for gifting, offices, or personal cravings"
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cherry_blossom/15 text-xs font-bold text-cherry_blossom"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className="leading-snug">{line}</span>
                  </li>
                ))}
                </ul>
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-dust_grey-200/80 bg-white p-5 shadow-md ring-1 ring-black/[0.04] sm:p-6 md:p-7">
                <div className="flex flex-col gap-6">
                <div>
                  <Button
                    href="/themed-snack-boxes"
                    className="min-h-[3.25rem] w-full justify-center rounded-xl px-8 text-base font-semibold shadow-md transition hover:shadow-lg sm:min-h-14"
                  >
                    Shop snack boxes
                  </Button>
                </div>

                <div className="border-t border-dust_grey-200/80 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-iron_grey/55">
                    For teams &amp; workplaces
                  </p>
                  <nav
                    aria-label="Corporate programs"
                    className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-2"
                  >
                    <Button
                      href="/corporate/team-snack-boxes"
                      variant="ghost"
                      className="min-h-[2.85rem] justify-center rounded-lg border-dust_grey-200 bg-powder_petal-50/50 px-2 text-center text-xs font-semibold leading-tight text-iron_grey shadow-none hover:border-primary/35 hover:bg-white hover:text-iron_grey sm:text-sm"
                    >
                      Team snack boxes
                    </Button>
                    <Button
                      href="/corporate/office-snack-pantry"
                      variant="ghost"
                      className="min-h-[2.85rem] justify-center rounded-lg border-dust_grey-200 bg-powder_petal-50/50 px-2 text-center text-xs font-semibold leading-tight text-iron_grey shadow-none hover:border-primary/35 hover:bg-white hover:text-iron_grey sm:text-sm"
                    >
                      Office pantry
                    </Button>
                    <Button
                      href="/corporate/bulk-pallet"
                      variant="ghost"
                      className="min-h-[2.85rem] justify-center rounded-lg border-dust_grey-200 bg-powder_petal-50/50 px-2 text-center text-xs font-semibold leading-tight text-iron_grey shadow-none hover:border-primary/35 hover:bg-white hover:text-iron_grey sm:text-sm"
                    >
                      Bulk &amp; pallet
                    </Button>
                    <Button
                      href="/our-programs"
                      variant="ghost"
                      className="min-h-[2.85rem] justify-center rounded-lg border-dust_grey-200 bg-powder_petal-50/50 px-2 text-center text-xs font-semibold leading-tight text-iron_grey shadow-none hover:border-primary/35 hover:bg-white hover:text-iron_grey sm:text-sm"
                    >
                      All programs
                    </Button>
                  </nav>
                </div>

                <p className="border-t border-dust_grey-100 pt-5 text-center text-sm font-medium leading-relaxed text-iron_grey/75 sm:text-left">
                  No subscription. No commitment. Just amazing snacks.
                </p>
                </div>
              </div>
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-col lg:min-h-[320px]">
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-dust_grey-200/80 bg-white p-3 shadow-lg ring-1 ring-black/[0.06] sm:p-4">
                <img
                  src="/hero-snack-box.png"
                  alt="Curated snack boxes filled with chips, crackers, fruit, and treats"
                  className="aspect-square w-full flex-1 rounded-xl object-contain object-center lg:min-h-0 lg:flex-1"
                  style={{
                    filter: "saturate(0.92) contrast(1.02)",
                    transform: "scale(1.12)"
                  }}
                />
              </div>
            </div>
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
