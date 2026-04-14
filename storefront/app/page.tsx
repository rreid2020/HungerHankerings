import type { Metadata } from "next"
import Link from "next/link"
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
      <section className="bg-powder_petal-50">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-5">
            <p className="section-subtitle">Hunger Hankerings</p>
            <h1 className="text-balance text-3xl font-semibold leading-tight text-iron_grey sm:text-4xl md:text-[2.35rem] lg:text-5xl">
              Canada&apos;s #1 Snack Box | Healthy, Fun &amp; Office Snack Delivery
            </h1>
            <p className="text-pretty text-lg font-medium text-iron_grey md:text-xl">
              Discover Canada&apos;s top-rated snack boxes — no subscription required, just great
              snacks delivered when you want them.
            </p>
            <div className="space-y-4 text-sm leading-relaxed text-iron_grey md:text-base">
              <p>
                <span className="font-semibold">Hey fellow snacker</span> 👋
                <br />
                Welcome to Canada&apos;s #1 snack box experience.
              </p>
              <p className="font-medium text-iron_grey">Whether you&apos;re a:</p>
              <ul className="list-disc space-y-1 pl-5 marker:text-cherry_blossom">
                <li>Mindless muncher</li>
                <li>On-the-go grazer</li>
                <li>Health-conscious snacker</li>
                <li>Late-night foodie</li>
              </ul>
              <p>
                We&apos;ve got the perfect box for you — no commitments, no subscriptions.
              </p>
              <p className="font-medium text-iron_grey">At Hunger Hankerings, we offer:</p>
              <ul className="list-none space-y-2 pl-0">
                <li>🥗 Healthy snack boxes for guilt-free enjoyment</li>
                <li>🏢 Office snack boxes to keep your team energized</li>
                <li>🎁 Themed snack gift boxes for every occasion</li>
              </ul>
              <p>
                Order anytime and enjoy premium, curated snacks delivered across Canada.
              </p>
            </div>

            <div className="rounded-xl border border-dust_grey-200 bg-white/80 p-5 shadow-sm backdrop-blur-sm md:p-6">
              <h2 className="text-base font-semibold text-iron_grey md:text-lg">
                Why Hunger Hankerings is Canada&apos;s #1 Snack Box
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm text-iron_grey md:text-[0.9375rem]">
                <li className="flex gap-2.5">
                  <span className="shrink-0 text-cherry_blossom" aria-hidden>
                    ✔
                  </span>
                  <span>No subscription — order anytime, hassle-free</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 text-cherry_blossom" aria-hidden>
                    ✔
                  </span>
                  <span>Curated snack boxes for individuals &amp; businesses</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 text-cherry_blossom" aria-hidden>
                    ✔
                  </span>
                  <span>Fast delivery anywhere in Canada 🇨🇦</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 text-cherry_blossom" aria-hidden>
                    ✔
                  </span>
                  <span>High-quality, handpicked snacks</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 text-cherry_blossom" aria-hidden>
                    ✔
                  </span>
                  <span>Perfect for gifting, offices, or personal cravings</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
                <Button href="/themed-snack-boxes" className="min-h-12 w-full justify-center px-8 text-base md:w-auto">
                  Shop snack boxes
                </Button>
                <div className="flex min-h-[3rem] flex-col justify-center gap-1 border-t border-dust_grey-200 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-iron_grey/70">
                    For teams &amp; workplaces
                  </p>
                  <nav
                    aria-label="Corporate programs"
                    className="flex flex-col gap-2 text-sm md:flex-row md:flex-wrap md:gap-x-1 md:gap-y-1"
                  >
                    <Link
                      href="/corporate/team-snack-boxes"
                      className="font-medium text-primary underline-offset-4 transition hover:text-primary-hover hover:underline"
                    >
                      Team snack boxes
                    </Link>
                    <span className="hidden text-iron_grey/40 md:inline" aria-hidden>
                      ·
                    </span>
                    <Link
                      href="/corporate/office-snack-pantry"
                      className="font-medium text-primary underline-offset-4 transition hover:text-primary-hover hover:underline"
                    >
                      Office pantry
                    </Link>
                    <span className="hidden text-iron_grey/40 md:inline" aria-hidden>
                      ·
                    </span>
                    <Link
                      href="/corporate/bulk-pallet"
                      className="font-medium text-primary underline-offset-4 transition hover:text-primary-hover hover:underline"
                    >
                      Bulk &amp; pallet
                    </Link>
                    <span className="hidden text-iron_grey/40 md:inline" aria-hidden>
                      ·
                    </span>
                    <Link
                      href="/our-programs"
                      className="font-medium text-iron_grey underline decoration-dust_grey-200 underline-offset-4 transition hover:text-iron_grey hover:decoration-iron_grey"
                    >
                      All programs
                    </Link>
                  </nav>
                </div>
              </div>
              <p className="text-center text-sm font-medium text-iron_grey/85 sm:text-left">
                No subscription. No commitment. Just amazing snacks.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-ash_grey-100 bg-white p-2 shadow-sm">
            <img
              src="/hero-snack-box.png"
              alt="Curated snack boxes filled with chips, crackers, fruit, and treats"
              className="h-full w-full rounded-md object-contain object-center"
              style={{
                filter: "saturate(0.92) contrast(1.02)",
                transform: "scale(1.15)"
              }}
            />
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
