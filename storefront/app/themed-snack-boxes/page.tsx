import type { Metadata } from "next"
import CheckoutButton from "../../components/CheckoutButton"
import LandingPageSections from "../../components/landing/LandingPageSections"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Themed snack boxes",
  description:
    "Discover Hunger Hankerings themed snack boxes—curated assortments for cravings, gifts, teams, and events across Canada.",
  alternates: { canonical: "/themed-snack-boxes" },
  openGraph: {
    title: `Themed snack boxes | ${SITE_NAME}`,
    description: "Curated themed snack boxes for gifts, teams, and events.",
    url: absoluteUrl("/themed-snack-boxes")
  }
}

const ThemedSnackBoxesPage = () => {
  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="container-page flex justify-end py-3">
          <CheckoutButton />
        </div>
      </div>
      <LandingPageSections />
    </div>
  )
}

export default ThemedSnackBoxesPage
