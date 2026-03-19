"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import CartButton from "./CartButton"
import { useAuth } from "./AuthContext"

const navLinks = [
  { label: "Themed Snack Boxes", href: "/themed-snack-boxes" },
  { label: "Our Programs", href: "/our-programs" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" }
]

const SiteHeader = () => {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <header className="border-b border-border">
      <div className="container-page flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center transition opacity-90 hover:opacity-100">
          <img
            src="/logo.png"
            alt="Hunger Hankerings"
            className="h-14 w-auto object-contain sm:h-16"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-foreground lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-cherry_blossom"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {showAccountActions ? (
            <>
              <Link
                href="/account"
                className="flex items-center justify-center rounded-md border border-border p-2 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="My Account"
              >
                {/* User account icon */}
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-foreground transition hover:text-cherry_blossom"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center rounded-md border border-border p-2 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Customer login"
            >
              {/* User/login icon */}
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
          )}
          <CartButton />
        </div>
      </div>
      <div className="border-t border-border lg:hidden">
        <div className="container-page flex flex-wrap gap-4 py-3 text-xs text-foreground">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-cherry_blossom">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
