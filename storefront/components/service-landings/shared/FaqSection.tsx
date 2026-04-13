import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { sectionShell, sectionY } from "./sectionShell"

export type FaqItem = {
  question: string
  answer: ReactNode
  /** Plain text for FAQPage JSON-LD and AI-friendly excerpts (keep in sync with `answer`). */
  schemaAnswer: string
}

type FaqSectionProps = {
  sectionId: string
  heading?: string
  intro?: ReactNode
  items: FaqItem[]
  className?: string
}

export default function FaqSection({
  sectionId,
  heading = "Frequently asked questions",
  intro,
  items,
  className = "bg-background"
}: FaqSectionProps) {
  return (
    <section className={`${sectionY} ${className}`} aria-labelledby={sectionId}>
      <div className={sectionShell}>
        <div className="mx-auto max-w-3xl">
          <h2
            id={sectionId}
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {heading}
          </h2>
          {intro ? (
            <div className="mt-2 text-base leading-relaxed text-muted-foreground [&_a]:text-primary">
              {intro}
            </div>
          ) : null}
          <div className="mt-10 divide-y divide-border border-t border-border">
            {items.map((item) => (
              <details
                key={item.question}
                className="group open:[&_summary_svg]:rotate-180"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-6 text-left [&::-webkit-details-marker]:hidden">
                  <span className="pr-2 text-base font-semibold text-foreground">
                    {item.question}
                  </span>
                  <ChevronDown
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200"
                    aria-hidden
                  />
                </summary>
                <div className="pb-6 pt-0 text-base leading-relaxed text-muted-foreground [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
