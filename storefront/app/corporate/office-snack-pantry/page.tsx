import type { Metadata } from "next"
import OfficeSnackPantryPage from "../../../components/service-landings/OfficeSnackPantryPage"

export const metadata: Metadata = {
  title: "Office Snack Pantry Service Canada | Workplace Snack Delivery",
  description:
    "Office snack pantry service for modern workplaces—full-service stocking, curated assortments, flexible schedules, and dedicated support across Canada.",
  openGraph: {
    title: "Office Snack Pantry Service | Hunger Hankerings",
    description:
      "Keep your workplace stocked with curated pantry snacks and flexible restocking."
  }
}

export default function CorporateOfficePantryRoute() {
  return <OfficeSnackPantryPage />
}
