import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ShippingRatesClient from "../../../../components/ops/ShippingRatesClient"

export const dynamic = "force-dynamic"

export default function OpsShippingRatesPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/ops"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Dashboard
      </Link>
      <ShippingRatesClient />
    </div>
  )
}

