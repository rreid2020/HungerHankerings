import type { Metadata } from "next"
import { absoluteUrl, SITE_NAME } from "../../lib/site"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Hunger Hankerings for snack box quotes, corporate programs, pantry service, bulk orders, or support—Canada-wide.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact | ${SITE_NAME}`,
    description: "Reach our team for quotes, programs, or support.",
    url: absoluteUrl("/contact")
  }
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
