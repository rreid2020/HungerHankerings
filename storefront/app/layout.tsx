import "./globals.css"
import SiteHeader from "../components/SiteHeader"
import SiteFooter from "../components/SiteFooter"
import ThemeInit from "../components/ThemeInit"
import { CartProvider } from "../components/CartContext"
import { AuthProvider } from "../components/AuthContext"
import JsonLd from "../components/JsonLd"
import type { Metadata } from "next"
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, getSiteOrigin } from "../lib/site"
import { organizationJsonLd, webSiteJsonLd } from "../lib/schema-org"

const siteOrigin = getSiteOrigin()

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: siteOrigin,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION
  },
  formatDetection: {
    telephone: false
  }
}

const orgLd = organizationJsonLd({
  url: siteOrigin,
  name: SITE_NAME,
  description: SITE_DEFAULT_DESCRIPTION,
  email: "hello@hungerhankerings.com"
})

const webLd = webSiteJsonLd({
  url: siteOrigin,
  name: SITE_NAME,
  description: SITE_DEFAULT_DESCRIPTION
})

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-CA" suppressHydrationWarning>
      <body>
        <JsonLd data={orgLd} id="ld-org" />
        <JsonLd data={webLd} id="ld-website" />
        <ThemeInit>
          <AuthProvider>
            <CartProvider>
              <SiteHeader />
              <main>{children}</main>
              <SiteFooter />
            </CartProvider>
          </AuthProvider>
        </ThemeInit>
      </body>
    </html>
  )
}
