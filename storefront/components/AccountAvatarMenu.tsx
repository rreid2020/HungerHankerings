"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useAuth } from "./AuthContext"
import clsx from "clsx"

const accountLinks = [
  { label: "Dashboard", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Profile", href: "/account/profile" },
  { label: "Addresses", href: "/account/addresses" }
] as const

const menuItemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted focus:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-4 w-4 shrink-0 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function IconBag({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-4 w-4 shrink-0 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}
function IconUser({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-4 w-4 shrink-0 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function IconMap({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-4 w-4 shrink-0 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={clsx("h-4 w-4 shrink-0 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

const linkIcons = {
  "/account": IconDashboard,
  "/account/orders": IconBag,
  "/account/profile": IconUser,
  "/account/addresses": IconMap
} as const

export default function AccountAvatarMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const onAccountPage = pathname != null && pathname.startsWith("/account")
  const showSignedInSection = Boolean(user) || onAccountPage

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, close])

  const handleLogout = async () => {
    close()
    await logout()
    router.push("/")
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={`${menuId}-trigger`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? `${menuId}-menu` : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center justify-center rounded-md border border-border p-2 text-foreground transition",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "bg-muted ring-2 ring-ring ring-offset-2"
        )}
        aria-label={showSignedInSection ? "Account menu" : "Sign in menu"}
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>

      {open && (
        <div
          id={`${menuId}-menu`}
          role="menu"
          aria-labelledby={`${menuId}-trigger`}
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-card py-2 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        >
          {user?.email && (
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Signed in
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{user.email}</p>
            </div>
          )}

          {!user && onAccountPage && (
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Session may be invalid — use Sign out to clear cookies, then sign in again.
              </p>
            </div>
          )}

          <div className="px-2 pt-2">
            {showSignedInSection && (
              <>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </p>
                <nav className="flex flex-col gap-0.5" aria-label="Account">
                  {accountLinks.map((item) => {
                    const Icon = linkIcons[item.href as keyof typeof linkIcons]
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={close}
                        className={menuItemClass}
                      >
                        {Icon ? <Icon /> : null}
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="my-2 border-t border-border" />
              </>
            )}

            {!showSignedInSection && (
              <>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Welcome
                </p>
                <nav className="flex flex-col gap-0.5" aria-label="Sign in">
                  <Link href="/login" role="menuitem" onClick={close} className={menuItemClass}>
                    <IconUser />
                    Sign in
                  </Link>
                  <Link href="/register" role="menuitem" onClick={close} className={menuItemClass}>
                    <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create account
                  </Link>
                </nav>
                <div className="my-2 border-t border-border" />
              </>
            )}

            {showSignedInSection && (
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className={clsx(menuItemClass, "text-foreground")}
              >
                <IconLogout />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
