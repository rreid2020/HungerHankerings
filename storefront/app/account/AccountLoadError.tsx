"use client"

import Link from "next/link"

export function AccountLoadError() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
      <p className="font-medium">Couldn&apos;t load your account.</p>
      <p className="mt-1 text-sm">Please sign out and try logging in again, or contact support if it continues.</p>
      <div className="mt-4">
        <Link
          href="/api/auth/logout"
          className="inline-block rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}
