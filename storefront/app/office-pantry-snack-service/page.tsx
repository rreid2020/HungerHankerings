import type { Metadata } from "next"
import Button from "../../components/Button"
import { contactQuoteHref } from "../../lib/contact-inquiry"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const metadata: Metadata = {
  title: "Office pantry snack service",
  description:
    "Office pantry snack restocking across Canada—curated mixes, custom schedules, and scalable programs for workplaces.",
  alternates: { canonical: "/office-pantry-snack-service" },
  openGraph: {
    title: `Office pantry snack service | ${SITE_NAME}`,
    description: "Keep the office pantry stocked with curated snacks.",
    url: absoluteUrl("/office-pantry-snack-service")
  }
}

const OfficePantryPage = () => {
  return (
    <div className="container-page space-y-12 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="section-subtitle">Office Pantry Snack Service</p>
          <h1 className="text-3xl font-semibold text-iron_grey">
            Keep the office pantry stocked
          </h1>
          <p className="text-sm text-iron_grey">
            We curate, restock, and manage pantry snacks so your team always has
            something fresh and trendy.
          </p>
          <div className="space-y-4">
            <div className="rounded-lg border border-dust_grey-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-iron_grey">
                How it works
              </h3>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-iron_grey">
                <li>We assess your pantry needs.</li>
                <li>We curate the ideal snack mix.</li>
                <li>We restock on your schedule.</li>
              </ol>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Benefits: boost morale and productivity",
                "Trendy snacks your team loves",
                "Dedicated account manager",
                "Variety for every dietary need"
              ].map((text) => (
                <div
                  key={text}
                  className="rounded-lg border border-dust_grey-200 bg-white p-4 text-sm text-iron_grey"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-lg border border-dust_grey-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-iron_grey">
            Request a pantry plan
          </h2>
          <p className="mt-3 text-sm text-iron_grey">
            Share your office location, headcount, restock frequency, and budget on our unified
            contact form—we will recommend a plan and follow up.
          </p>
          <div className="mt-8">
            <Button href={contactQuoteHref("office-pantry-plan")} className="min-h-11 px-8">
              Request a Custom Quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfficePantryPage
