"use client"

import { UserButton } from "@clerk/nextjs"

export default function OpsUserMenu() {
  return (
    <UserButton
      appearance={{
        variables: { colorPrimary: "#f97316" },
      }}
    />
  )
}
