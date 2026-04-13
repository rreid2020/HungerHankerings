import type { Metadata } from "next"
import BulkPalletServicePage from "../../../components/service-landings/BulkPalletServicePage"
import { absoluteUrl, SITE_NAME } from "../../../lib/site"

export const metadata: Metadata = {
  title: "Bulk & pallet snack box orders",
  description:
    "Bulk snack boxes and pallet delivery for corporate orders—custom configurations, themed or healthy mixes, and centralized delivery across Canada.",
  alternates: { canonical: "/corporate/bulk-pallet" },
  openGraph: {
    title: `Bulk & pallet snack boxes | ${SITE_NAME}`,
    description:
      "High-volume customized snack box orders delivered to your central location.",
    url: absoluteUrl("/corporate/bulk-pallet")
  }
}

export default function CorporateBulkPalletRoute() {
  return <BulkPalletServicePage />
}
