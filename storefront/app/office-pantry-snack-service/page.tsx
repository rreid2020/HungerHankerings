import LeadForm from "../../components/LeadForm"

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
        <div className="rounded-lg border border-dust_grey-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-iron_grey">
            Request a pantry plan
          </h2>
          <p className="mt-2 text-sm text-iron_grey">
            Tell us about your office and budget.
          </p>
          <div className="mt-6">
            <LeadForm
              type="office-pantry-snack-service"
              fields={[
                { name: "company", label: "Company" },
                { name: "name", label: "Contact" },
                { name: "email", label: "Email", type: "email" },
                { name: "phone", label: "Phone", type: "tel" },
                { name: "officeLocation", label: "Office location" },
                { name: "headcount", label: "Headcount" },
                { name: "frequency", label: "Frequency" },
                { name: "budget", label: "Budget" }
              ]}
              submitLabel="Request a plan"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OfficePantryPage
