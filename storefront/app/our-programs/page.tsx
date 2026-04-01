import Link from "next/link"

const programs = [
  {
    title: "Team Snacks Delivered",
    copy: "Corporate snack boxes with custom branding and Canada-wide delivery.",
    href: "/team-snacks-delivered"
  },
  {
    title: "Office Pantry Snack Service",
    copy: "Full pantry stocking, trend-driven assortments, and account support.",
    href: "/office-pantry-snack-service"
  }
]

const OurProgramsPage = () => {
  return (
    <div className="container-page space-y-10 py-12">
      <div>
        <p className="section-subtitle">Corporate Programs</p>
        <h1 className="text-3xl font-semibold text-iron_grey">
          Snack programs for teams and communities
        </h1>
        <p className="mt-2 text-sm text-iron_grey">
          Choose a program tailored to your workplace or fundraising needs.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {programs.map((program) => (
          <Link
            key={program.title}
            href={program.href}
            className="rounded-lg border border-dust_grey-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-md hover:border-ash_grey-200"
          >
            <h2 className="text-lg font-semibold text-iron_grey">
              {program.title}
            </h2>
            <p className="mt-3 text-sm text-iron_grey">{program.copy}</p>
            <span className="mt-4 inline-flex text-sm font-semibold text-iron_grey hover:text-iron_grey">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default OurProgramsPage
