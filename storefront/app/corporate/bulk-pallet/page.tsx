import type { Metadata } from "next"
import BulkPalletServicePage from "../../../components/service-landings/BulkPalletServicePage"

export const metadata: Metadata = {
  title: "Bulk Snack Boxes & Pallet Delivery Canada | Corporate Orders",
  description:
    "Bulk snack boxes and pallet delivery for corporate orders—custom configurations, themed or healthy mixes, and centralized delivery across Canada.",
  openGraph: {
    title: "Bulk & Pallet Snack Box Service | Hunger Hankerings",
    description:
      "High-volume customized snack box orders delivered to your central location."
  }
}

export default function CorporateBulkPalletRoute() {
  return <BulkPalletServicePage />
}
