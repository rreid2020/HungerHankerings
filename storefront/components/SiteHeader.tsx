"use client"

import Link from "next/link"
import { ChevronDown, Package, Building2, Warehouse } from "lucide-react"
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
        <div className="flex items-center gap-3">
          <AccountAvatarMenu />
          <CartButton />
        </div>
      </div>
      <div className="border-t border-border lg:hidden">
        <div className="container-page flex flex-col gap-2 py-3 text-xs text-foreground">
          <Link href="/shop" className="w-fit transition hover:text-cherry_blossom">
            Themed Snack Boxes
          </Link>
          <details className="w-full rounded-lg border border-border bg-muted/20 px-2 py-1 open:pb-2 open:[&>summary_svg]:rotate-180">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium transition hover:text-cherry_blossom [&::-webkit-details-marker]:hidden">
              <span>Corporate Programs</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60 transition-transform" aria-hidden />
            </summary>
            <div className="mt-2 border-t border-border pt-2">
              <Link
                href="/our-programs"
                className="mb-2 block w-fit text-[11px] text-muted-foreground underline-offset-2 hover:text-cherry_blossom hover:underline"
              >
                View all corporate programs
              </Link>
              <CorporateFlyoutLinks className="flex flex-col gap-0.5" />
            </div>
          </details>
          <div className="flex flex-wrap gap-4">
            <Link href="/faqs" className="transition hover:text-cherry_blossom">
              FAQs
            </Link>
            <Link href="/contact" className="transition hover:text-cherry_blossom">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
