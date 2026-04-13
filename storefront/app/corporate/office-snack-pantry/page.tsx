import type { Metadata } from "next"
import OfficeSnackPantryPage from "../../../components/service-landings/OfficeSnackPantryPage"
import { absoluteUrl, SITE_NAME } from "../../../lib/site"

export const metadata: Metadata = {
  title: "Office snack pantry service (Canada)",
  description:
    "Office snack pantry service for modern workplaces—full-service stocking, curated assortments, flexible schedules, and dedicated support across Canada.",
  alternates: { canonical: "/corporate/office-snack-pantry" },
  openGraph: {
    title: `Office snack pantry service | ${SITE_NAME}`,
    description:
      "Keep your workplace stocked with curated pantry snacks and flexible restocking.",
    url: absoluteUrl("/corporate/office-snack-pantry")
  }
}

export default function CorporateOfficePantryRoute() {
  return <OfficeSnackPantryPage />
}
