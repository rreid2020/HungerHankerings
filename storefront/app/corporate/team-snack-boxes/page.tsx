import type { Metadata } from "next"
import TeamSnackBoxesPage from "../../../components/service-landings/TeamSnackBoxesPage"
import { absoluteUrl, SITE_NAME } from "../../../lib/site"

export const metadata: Metadata = {
  title: "Corporate team snack boxes (Canada)",
  description:
    "Corporate team snack boxes delivered across Canada. Curated boxes for remote teams, onboarding, appreciation, and client gifting—with custom branding and flexible orders.",
  alternates: { canonical: "/corporate/team-snack-boxes" },
  openGraph: {
    title: `Corporate team snack boxes | ${SITE_NAME}`,
    description:
      "Curated team snack boxes delivered Canada-wide for employee and client gifting.",
    url: absoluteUrl("/corporate/team-snack-boxes")
  }
}

export default function CorporateTeamSnackBoxesRoute() {
  return <TeamSnackBoxesPage />
}
