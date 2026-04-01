import Button from "../components/Button"
import ProductCard from "../components/ProductCard"
import { listProducts } from "../lib/vendure"
import Link from "next/link"

// Fetch uses no-store (dynamic); avoid static generation at build when API is unavailable
export const dynamic = "force-dynamic"

const HomePage = async () => {
  let products: Awaited<ReturnType<typeof listProducts>> = []
  try {
    products = await listProducts()
  } catch (err) {
    console.error("Products fetch failed:", err)
  }

  return (
    <div className="space-y-24 pb-24">
      <section className="bg-powder_petal-50">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="section-subtitle">Hunger Hankerings</p>
            <h1 className="text-4xl font-semibold text-iron_grey md:text-5xl">
              Hey fellow snacker! Welcome to Hunger Hankerings
            </h1>
            <p className="text-lg text-iron_grey">
              What type of snacker are you?
            </p>
            <p className="text-sm text-iron_grey">
              The Mindless Muncher? The On-the-Go Grazer? The Health Nut? The
              Late Night Looter? Whichever one you are, we've got you covered!
              We have a wide range of themed snack boxes that are sure to
              satisfy!
            </p>
            <div className="flex flex-wrap gap-3">
              <Button href="/themed-snack-boxes">Shop Snack Boxes</Button>
              <Button href="/team-snacks-delivered" variant="ghost">
                Team Snack Boxes
              </Button>
              <Button href="/office-pantry-snack-service" variant="ghost">
                Office Pantry
              </Button>
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

      <section className="container-page space-y-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-subtitle">Team Snack Boxes</p>
          <h2 className="section-title text-3xl md:text-4xl">
            Team Snack Boxes Delivered Anywhere in Canada
          </h2>
          <p className="mt-4 text-base text-iron_grey md:text-lg">
            Make team gifting effortless with curated snack boxes your employees and clients will
            actually enjoy.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-iron_grey md:text-base">
            Whether you&apos;re welcoming new hires, celebrating milestones, or sending appreciation
            gifts, our snack boxes are designed to create memorable experiences—no matter where your
            team is located.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <h3 className="text-center text-xl font-semibold text-iron_grey md:text-2xl">
            Built for Modern Teams
          </h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Remote & hybrid teams",
              "Employee onboarding & welcome kits",
              "Holiday gifts & team celebrations",
              "Client gifting & thank-you packages"
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-dust_grey-200 bg-white px-4 py-3 text-left text-sm text-iron_grey shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-powder_petal-100 text-xs font-bold text-iron_grey">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mx-auto max-w-3xl text-center text-xl font-semibold text-iron_grey md:text-2xl">
            Why Teams Love Our Snack Boxes
          </h3>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Curated with Variety",
                body: "A mix of recognizable, high-quality snacks—sweet, salty, and better-for-you options."
              },
              {
                title: "Customizable to Your Needs",
                body: "Choose box sizes, snack types, and add branded touches for a personalized experience."
              },
              {
                title: "Delivered Anywhere",
                body: "Ship to individual addresses across Canada or send in bulk to one location."
              },
              {
                title: "Flexible for Any Team Size",
                body: "From 10 boxes to 1,000+, we scale with your needs."
              }
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col rounded-lg border border-dust_grey-200 bg-white p-6 text-center shadow-sm sm:text-left"
              >
                <h4 className="text-base font-semibold text-iron_grey">{card.title}</h4>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-iron_grey">{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mx-auto max-w-3xl text-center">
            <p className="section-subtitle">Simple, Hassle-Free Process</p>
            <p className="mt-3 text-sm leading-relaxed text-iron_grey md:text-base">
              We make it easy to send snack boxes your team will love—without the logistics
              headache.
            </p>
          </div>
          <div className="relative mt-12 grid gap-8 md:grid-cols-3">
            <div
              className="absolute left-0 right-0 top-[52px] hidden h-0.5 bg-ash_grey-200 md:block"
              style={{ marginLeft: "16.67%", marginRight: "16.67%" }}
              aria-hidden
            />
            {[
              "Choose your box or request customization",
              "We curate and pack your order",
              "We deliver across Canada"
            ].map((title, index) => (
              <div key={title} className="relative flex h-full flex-col items-center text-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-powder_petal-100 text-iron_grey">
                    {index === 0 ? (
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    ) : index === 1 ? (
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    ) : (
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 16v4m0-8V4m0 8l2-2 2 2 2-2 2 2" />
                      </svg>
                    )}
                  </div>
                  <div className="relative z-10 mt-3 flex h-8 w-8 items-center justify-center rounded-md bg-ash_grey-500 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                </div>
                <div className="mt-4 flex flex-1 flex-col justify-center rounded-lg border border-dust_grey-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold leading-snug text-iron_grey">{title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-dust_grey-200 bg-powder_petal-50 p-10 text-center">
          <h3 className="text-xl font-semibold text-iron_grey md:text-2xl">Ready to Get Started?</h3>
          <div className="mt-6 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row">
            <Button href="/corporate/team-snack-boxes" variant="secondary" className="min-w-[260px] px-8">
              Explore Team Snack Boxes
            </Button>
            <Button href="/team-snacks-delivered" variant="ghost" className="min-w-[260px] px-8">
              Request a Custom Quote
            </Button>
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
        <div className="mb-10 text-center">
          <p className="section-subtitle">Our Boxes</p>
          <h2 className="section-title">Snack box favorites</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-iron_grey">
            A vast selection of shareable and individual size snacks, beverages, and more! Select from the following boxes.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {products.slice(0, 3).map((product) => (
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
            <Button href="/contact" variant="primary">
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
