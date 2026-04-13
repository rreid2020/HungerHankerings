import type { Metadata } from "next"
import CorporateProgramsLanding from "../../components/corporate-programs/CorporateProgramsLanding"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const metadata: Metadata = {
  title: "Corporate snack programs & office delivery",
  description:
    "Corporate snack programs and office snack delivery across Canada. Corporate gift snack boxes, bulk snack boxes Canada, custom branding, and pantry service for teams of any size.",
  alternates: { canonical: "/our-programs" },
  openGraph: {
    title: `Corporate snack programs | ${SITE_NAME}`,
    description:
      "Corporate snack programs and office delivery—gift boxes, bulk orders, custom branding, and pantry service.",
    url: absoluteUrl("/our-programs")
  }
}

const OurProgramsPage = () => {
  return <CorporateProgramsLanding />
}

export default OurProgramsPage
