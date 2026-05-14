import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { headers } from "next/headers"
import { Suspense } from "react"
import SiteHeader from "../components/SiteHeader"
import SiteFooter from "../components/SiteFooter"
import ThemeInit from "../components/ThemeInit"
import PostHogProvider from "../components/PostHogProvider"
import { CartProvider } from "../components/CartContext"
import { AuthProvider } from "../components/AuthContext"
import JsonLd from "../components/JsonLd"
import type { Metadata, Viewport } from "next"
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, getSiteOrigin } from "../lib/site"
import { organizationJsonLd, webSiteJsonLd } from "../lib/schema-org"
import { isOpsRequestHeaders } from "../lib/ops-host"

const siteOrigin = getSiteOrigin()

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
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
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: siteOrigin,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  formatDetection: {
    telephone: false,
  },
}

const orgLd = organizationJsonLd({
  url: siteOrigin,
  name: SITE_NAME,
  description: SITE_DEFAULT_DESCRIPTION,
  email: "hello@hungerhankerings.com",
})

const webLd = webSiteJsonLd({
  url: siteOrigin,
  name: SITE_NAME,
  description: SITE_DEFAULT_DESCRIPTION,
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const ops = isOpsRequestHeaders(h)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? ""
  const posthogHost = (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    process.env.POSTHOG_HOST?.trim() ||
    "https://us.i.posthog.com"
  ).replace(/\/+$/, "")

  if (ops) {
    return (
      <html lang="en-CA" suppressHydrationWarning>
        <body className="min-h-screen min-w-0 antialiased">
          <Suspense fallback={<div className="min-h-screen bg-zinc-950" aria-hidden />}>
            <ClerkProvider dynamic afterSignOutUrl="/ops/sign-in">
              <ThemeInit>{children}</ThemeInit>
            </ClerkProvider>
          </Suspense>
        </body>
      </html>
    )
  }

  return (
    <html lang="en-CA" suppressHydrationWarning>
      <body>
        <JsonLd data={orgLd} id="ld-org" />
        <JsonLd data={webLd} id="ld-website" />
        <ThemeInit>
          <PostHogProvider posthogKey={posthogKey} posthogHost={posthogHost}>
            <AuthProvider>
              <CartProvider>
                <SiteHeader />
                <main className="min-w-0">{children}</main>
                <SiteFooter />
              </CartProvider>
            </AuthProvider>
          </PostHogProvider>
        </ThemeInit>
      </body>
    </html>
  )
}
