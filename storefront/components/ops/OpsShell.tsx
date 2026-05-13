import Link from "next/link"
import {
  ExternalLink,
  Inbox,
  LayoutDashboard,
  PanelLeft,
  Truck,
} from "lucide-react"
import { getVendureAdminUrl } from "../../lib/ops-host"
import OpsUserMenu from "./OpsUserMenu"

const nav = [
  { href: "/ops", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ops/leads", label: "Leads", icon: Inbox },
  { href: "/ops/shipping-rates", label: "Shipping Rates", icon: Truck },
] as const

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const vendureAdmin = getVendureAdminUrl()
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim())

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <PanelLeft className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
            <span className="truncate text-sm font-semibold tracking-tight">HH Ops</span>
          </div>
          {clerkEnabled ? (
            <div className="shrink-0 [&_.cl-userButtonTrigger]:rounded-md [&_.cl-userButtonTrigger]:ring-1 [&_.cl-userButtonTrigger]:ring-slate-300">
              <OpsUserMenu />
            </div>
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          ))}
          <a
            href={vendureAdmin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            Vendure Admin
          </a>
        </nav>
        <p className="border-t border-slate-200 p-3 text-xs leading-relaxed text-slate-500">
          Staff portal on the ops host. Do not link from the public storefront.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 md:hidden">
          <span className="shrink-0 text-sm font-semibold">HH Ops</span>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {label}
              </Link>
            ))}
            <a
              href={vendureAdmin}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-slate-900"
            >
              Vendure
            </a>
          </div>
          {clerkEnabled ? (
            <div className="shrink-0 [&_.cl-userButtonTrigger]:h-8 [&_.cl-userButtonTrigger]:w-8">
              <OpsUserMenu />
            </div>
          ) : null}
        </header>
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">
          <div className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 py-8 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
