"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useId, useState } from "react"
import { Building2, ChevronDown, Menu, Package, Warehouse, X } from "lucide-react"
import CartButton from "./CartButton"
import AccountAvatarMenu from "./AccountAvatarMenu"

const corporatePrograms = [
  {
    href: "/corporate/team-snack-boxes",
    title: "Team Snack Boxes",
    description:
      "Curated boxes for teams, onboarding, and client gifting—delivered across Canada.",
    Icon: Package
  },
  {
    href: "/corporate/office-snack-pantry",
    title: "Office Snack Pantry Service",
    description:
      "Full-service workplace stocking with flexible schedules and dedicated support.",
    Icon: Building2
  },
  {
    href: "/corporate/bulk-pallet",
    title: "Bulk & Pallet Snack Box Service",
    description:
      "High-volume custom orders and pallet delivery to your central location.",
    Icon: Warehouse
  }
] as const

const navLinks = [
  { label: "Themed Snack Boxes", href: "/shop" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contact" }
]

const mobileNavLinkClass =
  "block rounded-lg px-3 py-3.5 text-base font-medium text-foreground transition hover:bg-muted hover:text-cherry_blossom focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function CorporateFlyoutLinks({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {corporatePrograms.map(({ href, title, description, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex gap-3 rounded-xl px-2 py-3 transition hover:bg-muted/80"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">{title}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground sm:text-xs">
                {description}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const SiteHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelId = useId()
  const pathname = usePathname()

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    closeMobile()
  }, [pathname, closeMobile])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen, closeMobile])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container-page flex h-16 min-w-0 items-center justify-between gap-2 sm:h-20 sm:gap-4">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center transition opacity-90 hover:opacity-100"
        >
          <img
            src="/logo.png"
            alt="Hunger Hankerings"
            className="h-10 max-h-12 w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-14 sm:max-h-none sm:max-w-none md:h-16"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-foreground lg:flex" aria-label="Main">
          <Link href="/shop" className="transition hover:text-cherry_blossom">
            Themed Snack Boxes
          </Link>
          <div className="group/corp relative">
            <Link
              href="/our-programs"
              className="flex items-center gap-1 transition hover:text-cherry_blossom"
            >
              Corporate Programs
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            </Link>
            <div
              className="absolute left-1/2 top-full z-50 hidden w-[min(100vw-2rem,28rem)] -translate-x-1/2 pt-3 group-hover/corp:block group-focus-within/corp:block"
              role="region"
              aria-label="Corporate program services"
            >
              <div className="rounded-2xl border border-border bg-popover p-3 shadow-xl ring-1 ring-black/5">
                <CorporateFlyoutLinks className="flex flex-col gap-1" />
              </div>
            </div>
          </div>
          {navLinks.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-cherry_blossom"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={panelId}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <Menu className="h-5 w-5 shrink-0" aria-hidden />
            )}
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          </button>
          <AccountAvatarMenu />
          <CartButton />
        </div>
      </div>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-x-0 top-16 bottom-0 z-[55] bg-black/40 backdrop-blur-[1px] sm:top-20 lg:hidden"
            aria-hidden
            onClick={closeMobile}
          />
          <div
            id={panelId}
            className="fixed inset-x-0 top-16 bottom-0 z-[60] flex flex-col border-t border-border bg-background shadow-xl sm:top-20 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <nav
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
              aria-label="Main"
            >
              <ul className="flex flex-col gap-1">
                <li>
                  <Link href="/shop" className={mobileNavLinkClass} onClick={closeMobile}>
                    Themed Snack Boxes
                  </Link>
                </li>
                <li>
                  <details className="group rounded-lg border border-border bg-muted/15 open:bg-muted/25">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-3.5 text-base font-medium text-foreground transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span>Corporate Programs</span>
                      <ChevronDown
                        className="h-5 w-5 shrink-0 opacity-60 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <div className="border-t border-border px-1 pb-3 pt-2">
                      <Link
                        href="/our-programs"
                        className="mb-3 block px-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
                        onClick={closeMobile}
                      >
                        View all corporate programs
                      </Link>
                      <CorporateFlyoutLinks className="flex flex-col gap-0.5" />
                    </div>
                  </details>
                </li>
                {navLinks.slice(1).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={mobileNavLinkClass} onClick={closeMobile}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  )
}

export default SiteHeader
