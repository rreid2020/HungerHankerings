import type { Metadata } from "next"
import Link from "next/link"
import Button from "../../components/Button"
import JsonLd from "../../components/JsonLd"
import FaqSection from "../../components/service-landings/shared/FaqSection"
import {
  bulkPalletFaqItems,
  generalFaqItems,
  officePantryFaqItems,
  teamSnackFaqItems
} from "../../data/serviceAndCorporateFaqs"
import { faqPageJsonLd } from "../../lib/schema-org"
import { contactQuoteHref } from "../../lib/contact-inquiry"
import { absoluteUrl } from "../../lib/site"

const faqLd = faqPageJsonLd(
  [
    ...generalFaqItems,
    ...teamSnackFaqItems,
    ...officePantryFaqItems,
    ...bulkPalletFaqItems
  ].map((item) => ({ question: item.question, answer: item.schemaAnswer }))
)

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers about Hunger Hankerings themed snack boxes, team programs, office pantry service, bulk and pallet orders, shipping within Canada, and how to reach us.",
  alternates: { canonical: "/faqs" },
  openGraph: {
    title: "FAQs | Hunger Hankerings",
    description:
      "Answers about themed snack boxes, team programs, office pantry, bulk orders, Canada shipping, and contact options.",
    url: absoluteUrl("/faqs")
  }
}

const toc = [
  { href: "#faq-general", label: "General" },
  { href: "#faq-team", label: "Team snack boxes" },
  { href: "#faq-pantry", label: "Office pantry" },
  { href: "#faq-bulk", label: "Bulk & pallet" }
] as const

export default function FaqsPage() {
  return (
    <>
      <JsonLd data={faqLd} id="ld-faq-page" />
      <div className="bg-background text-foreground">
      <section className="border-b border-border bg-powder_petal-50/60">
        <div className="container-page py-12 md:py-16">
          <p className="section-subtitle text-iron_grey">FAQs</p>
          <h1 className="text-3xl font-semibold text-iron_grey md:text-4xl">
            Frequently asked questions
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-iron_grey md:text-base">
            Everything in one place—general questions plus details on team boxes, office pantry, and
            bulk programs. Service pages include the same FAQs below the fold.
          </p>
          <nav
            className="mt-8 flex flex-wrap gap-2"
            aria-label="FAQ sections"
          >
            {toc.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-full border border-dust_grey-200 bg-white px-4 py-2 text-sm font-medium text-iron_grey shadow-sm transition hover:border-ash_grey-500 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <FaqSection
        sectionId="faq-general"
        heading="General"
        intro="Ordering, shipping in Canada, dietary options, and how to reach us."
        items={generalFaqItems}
        className="bg-background"
      />

      <FaqSection
        sectionId="faq-team"
        heading="Team snack boxes"
        intro={
          <>
            Corporate gifting and multi-address delivery.{" "}
            <Link
              href="/corporate/team-snack-boxes"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              View the team snack boxes page
            </Link>
            .
          </>
        }
        items={teamSnackFaqItems}
        className="border-t border-border bg-muted/25"
      />

      <FaqSection
        sectionId="faq-pantry"
        heading="Office snack pantry service"
        intro={
          <>
            Workplace restocking and custom schedules.{" "}
            <Link
              href="/corporate/office-snack-pantry"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              View the office pantry page
            </Link>
            .
          </>
        }
        items={officePantryFaqItems}
        className="bg-background"
      />

      <FaqSection
        sectionId="faq-bulk"
        heading="Bulk & pallet snack box service"
        intro={
          <>
            High-volume and centralized delivery.{" "}
            <Link
              href="/corporate/bulk-pallet"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              View the bulk & pallet page
            </Link>
            .
          </>
        }
        items={bulkPalletFaqItems}
        className="border-t border-border bg-muted/25"
      />

      <section className="border-t border-border bg-powder_petal-50/50 py-12 md:py-14">
        <div className="container-page flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-iron_grey">Still have questions?</h2>
            <p className="mt-1 text-sm text-iron_grey">
              We&apos;re happy to help with a custom quote or program design.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={contactQuoteHref("general")} variant="secondary">
              Contact us
            </Button>
            <Button href="/shop" variant="ghost">
              Shop snack boxes
            </Button>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
