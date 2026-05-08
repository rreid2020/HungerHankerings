import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Ops",
  robots: { index: false, follow: false },
}

export default function OpsSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
