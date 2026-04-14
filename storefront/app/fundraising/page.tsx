import type { Metadata } from "next"
import Button from "../../components/Button"
import { contactQuoteHref } from "../../lib/contact-inquiry"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const metadata: Metadata = {
  title: "Fundraising with snack boxes",
  description:
    "Fundraise with Hunger Hankerings snack boxes—earn up to 25%, Canada-wide delivery, and fast program setup for schools and causes.",
  alternates: { canonical: "/fundraising" },
  openGraph: {
    title: `Fundraising snack boxes | ${SITE_NAME}`,
    description: "Earn up to 25% with curated snack box fundraising and Canada-wide delivery.",
    url: absoluteUrl("/fundraising")
  }
}

const FundraisingPage = () => {
  return (
    <div className="container-page space-y-10 py-8 sm:py-12">
      <div className="rounded-lg border border-ash_grey-500 bg-ash_grey-500 px-4 py-8 text-white sm:px-8 sm:py-10 md:px-10 md:py-12">
        <p className="section-subtitle text-ash_grey-100">Fundraising</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Fundraise with snack boxes
        </h1>
        <p className="mt-3 text-sm text-ash_grey-100">
          Earn up to 25% while delivering curated snack boxes across Canada.
        </p>
        <div className="mt-6">
          <Button href={contactQuoteHref("fundraising")} variant="primary">
            Get in touch
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[
          "Earn up to 25% for your cause",
          "Canada-wide delivery",
          "Setup in 24-48 hours",
          "Flexible shipping options"
        ].map((perk) => (
          <div
            key={perk}
            className="rounded-lg border border-dust_grey-200 bg-white p-6 text-sm text-iron_grey"
          >
            {perk}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FundraisingPage
