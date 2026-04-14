import { Suspense } from "react"
import ContactQuoteForm from "../../components/ContactQuoteForm"
import { normalizeInquiryReason } from "../../lib/contact-inquiry"

type ContactPageProps = {
  searchParams: Promise<{ reason?: string }>
}

const FormFallback = () => (
  <div
    className="space-y-4 animate-pulse"
    aria-hidden
  >
    <div className="h-12 rounded-md bg-dust_grey-100" />
    <div className="h-12 rounded-md bg-dust_grey-100" />
    <div className="h-12 rounded-md bg-dust_grey-100" />
    <div className="h-28 rounded-md bg-dust_grey-100" />
  </div>
)

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const sp = await searchParams
  const initialReason = normalizeInquiryReason(sp.reason)

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p className="section-subtitle">Contact</p>
        <h1 className="text-3xl font-semibold text-iron_grey">
          Let us build your snack plan
        </h1>
        <p className="mt-3 text-sm text-iron_grey">
          Share your goals and we will follow up with a curated proposal.
        </p>
      </div>
      <div className="rounded-3xl border border-dust_grey-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<FormFallback />}>
          <ContactQuoteForm initialReason={initialReason} />
        </Suspense>
      </div>
    </div>
  )
}
