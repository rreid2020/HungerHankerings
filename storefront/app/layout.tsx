import "./globals.css"
import SiteHeader from "../components/SiteHeader"
import SiteFooter from "../components/SiteFooter"
import ThemeInit from "../components/ThemeInit"
import { CartProvider } from "../components/CartContext"
import { AuthProvider } from "../components/AuthContext"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hunger Hankerings",
  description: "Snack boxes, pantry service, and fundraising programs."
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
