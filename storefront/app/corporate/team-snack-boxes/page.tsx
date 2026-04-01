import type { Metadata } from "next"
import TeamSnackBoxesPage from "../../../components/service-landings/TeamSnackBoxesPage"

export const metadata: Metadata = {
  title: "Corporate Team Snack Boxes Canada | Employee & Client Gifting",
  description:
    "Corporate team snack boxes delivered across Canada. Curated boxes for remote teams, onboarding, appreciation, and client gifting—with custom branding and flexible orders.",
  openGraph: {
    title: "Corporate Team Snack Boxes Canada | Hunger Hankerings",
    description:
      "Curated team snack boxes delivered Canada-wide for employee and client gifting."
  }
}

export default function CorporateTeamSnackBoxesRoute() {
  return <TeamSnackBoxesPage />
}
