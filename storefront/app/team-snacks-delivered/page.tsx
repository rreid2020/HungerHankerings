import type { Metadata } from "next"
import Button from "../../components/Button"
import { contactQuoteHref } from "../../lib/contact-inquiry"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const metadata: Metadata = {
  title: "Team snacks delivered (Canada)",
  description:
    "Corporate snack boxes delivered Canada-wide—sourcing, packing, and shipping handled for remote and hybrid teams.",
  alternates: { canonical: "/team-snacks-delivered" },
  openGraph: {
    title: `Team snacks delivered | ${SITE_NAME}`,
    description: "Corporate snack boxes made easy with Canada-wide delivery.",
    url: absoluteUrl("/team-snacks-delivered")
  }
}

const TeamSnacksDeliveredPage = () => {
  return (
    <div className="container-page space-y-12 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <p className="section-subtitle">Team Snacks Delivered</p>
          <h1 className="text-3xl font-semibold text-iron_grey">
            Corporate snack boxes made easy
          </h1>
          <p className="text-sm text-iron_grey">
            Reward and retain your team with curated snack boxes delivered
            Canada-wide. We handle sourcing, packing, and shipping so your team
            gets a consistent snack experience.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-dust_grey-200 bg-white p-4">
              <p className="text-sm font-semibold text-iron_grey">
                Orders start at $42.99 incl. shipping
              </p>
              <p className="mt-2 text-xs text-iron_grey">
                Flexible for one-time or recurring snack drops.
              </p>
            </div>
            <div className="rounded-lg border border-dust_grey-200 bg-white p-4">
              <p className="text-sm font-semibold text-iron_grey">
                Custom logo card
              </p>
              <p className="mt-2 text-xs text-iron_grey">
                Add a branded note to every box.
              </p>
            </div>
            <div className="rounded-lg border border-dust_grey-200 bg-white p-4">
              <p className="text-sm font-semibold text-iron_grey">
                Canada-wide delivery
              </p>
              <p className="mt-2 text-xs text-iron_grey">
                Reliable shipping for distributed teams.
              </p>
            </div>
            <div className="rounded-lg border border-dust_grey-200 bg-white p-4">
              <p className="text-sm font-semibold text-iron_grey">
                Dietary options
              </p>
              <p className="mt-2 text-xs text-iron_grey">
                Vegan, gluten-free, and nut-free mixes available.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-lg border border-dust_grey-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-iron_grey">
            Build your team snack plan
          </h2>
          <p className="mt-3 text-sm text-iron_grey">
            Tell us about your team, delivery preferences, dietary needs, and timeline on our
            contact form—we will follow up with a tailored quote.
          </p>
          <div className="mt-8">
            <Button href={contactQuoteHref("team-snack-delivery")} className="min-h-11 px-8">
              Request a Custom Quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeamSnacksDeliveredPage
