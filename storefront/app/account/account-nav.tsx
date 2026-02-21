"use client"

import { usePathname } from "next/navigation"

const navConfig = [
  { label: "Dashboard", href: "/account", icon: "dashboard" },
  { label: "Orders", href: "/account/orders", icon: "orders" },
  { label: "Profile", href: "/account/profile", icon: "profile" },
  { label: "Addresses", href: "/account/addresses", icon: "addresses" }
] as const

function NavIcon({ name, active }: { name: (typeof navConfig)[number]["icon"]; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor"
  const strokeWidth = active ? 2.5 : 1.5
  const className = "h-5 w-5 shrink-0"
  switch (name) {
    case "dashboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={strokeWidth} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    case "orders":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={strokeWidth} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    case "profile":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={strokeWidth} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case "addresses":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke={stroke} strokeWidth={strokeWidth} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return null
  }
}

const iconByHref: Record<string, (typeof navConfig)[number]["icon"]> = {
  "/account": "dashboard",
  "/account/orders": "orders",
  "/account/profile": "profile",
  "/account/addresses": "addresses"
}

export default function AccountNav({
  navItems
}: {
  navItems: { label: string; href: string }[]
}) {
  const pathname = usePathname()
  const items = navItems.map((item) => ({
    ...item,
    icon: iconByHref[item.href] ?? "dashboard"
  }))

  return (
    <nav className="space-y-0.5" aria-label="Account navigation">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/account" && pathname.startsWith(item.href))
        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <NavIcon name={item.icon} active={isActive} />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
