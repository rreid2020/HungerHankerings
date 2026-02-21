import Button from "../../components/Button"

const FundraisingPage = () => {
  return (
    <div className="container-page space-y-10 py-12">
      <div className="rounded-lg border border-ash_grey-500 bg-ash_grey-500 px-10 py-12 text-white">
        <p className="section-subtitle text-ash_grey-100">Fundraising</p>
        <h1 className="text-3xl font-semibold">
          Fundraise with snack boxes
        </h1>
        <p className="mt-3 text-sm text-ash_grey-100">
          Earn up to 25% while delivering curated snack boxes across Canada.
        </p>
        <div className="mt-6">
          <Button href="/contact" variant="primary">
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
