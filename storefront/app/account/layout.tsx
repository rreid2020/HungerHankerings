import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAuthUser } from "../../lib/auth"
import AccountNav from "./account-nav"

const accountNav = [
  { label: "Dashboard", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Profile", href: "/account/profile" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Sign out", href: "/api/auth/logout" }
]

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false }
}

export default async function AccountLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { hasToken } = await getAuthUser()

  if (!hasToken) {
    redirect("/login?redirect=" + encodeURIComponent("/account"))
  }

  return (
    <div className="container-page py-12">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar - uses site header from root layout */}
        <aside className="space-y-1">
          <h2 className="mb-4 text-lg font-semibold text-foreground">My Account</h2>
          <AccountNav navItems={accountNav} />
        </aside>

        {/* Main content */}
        <div className="min-h-[400px]">{children}</div>
      </div>
    </div>
  )
}
