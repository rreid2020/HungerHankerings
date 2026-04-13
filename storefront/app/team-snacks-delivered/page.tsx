import type { Metadata } from "next"
import LeadForm from "../../components/LeadForm"
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
        <div className="rounded-lg border border-dust_grey-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-iron_grey">
            Build your team snack plan
          </h2>
          <p className="mt-2 text-sm text-iron_grey">
            Tell us about your team and delivery preferences.
          </p>
          <div className="mt-6">
            <LeadForm
              type="team-snacks-delivered"
              fields={[
                { name: "company", label: "Company" },
                { name: "name", label: "Contact name" },
                { name: "email", label: "Email", type: "email" },
                { name: "phone", label: "Phone", type: "tel" },
                { name: "recipients", label: "# recipients" },
                { name: "deliveryType", label: "Delivery type" },
                { name: "date", label: "Date", type: "date" },
                { name: "dietaryNeeds", label: "Dietary needs" }
              ]}
              submitLabel="Request a quote"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeamSnacksDeliveredPage
