"use client"

import Link from "next/link"
import CartButton from "./CartButton"
import AccountAvatarMenu from "./AccountAvatarMenu"

const navLinks = [
  { label: "Themed Snack Boxes", href: "/shop" },
  { label: "Our Programs", href: "/our-programs" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" }
]

const SiteHeader = () => {
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
          <AccountAvatarMenu />
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
