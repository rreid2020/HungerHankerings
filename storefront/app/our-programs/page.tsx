import type { Metadata } from "next"
import CorporateProgramsLanding from "../../components/corporate-programs/CorporateProgramsLanding"

export const metadata: Metadata = {
  title: "Corporate Snack Programs | Office Snack Delivery Canada | Hunger Hankerings",
  description:
    "Corporate snack programs and office snack delivery across Canada. Corporate gift snack boxes, bulk snack boxes Canada, custom branding, and pantry service for teams of any size.",
  openGraph: {
    title:
      "Corporate Snack Programs | Office Snack Delivery Canada | Hunger Hankerings",
    description:
      "Corporate snack programs and office snack delivery across Canada. Corporate gift snack boxes, bulk snack boxes Canada, custom branding, and pantry service for teams of any size."
  }
}

const OurProgramsPage = () => {
  return <CorporateProgramsLanding />
}

export default OurProgramsPage
