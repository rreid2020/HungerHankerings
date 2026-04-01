import type { LucideIcon } from "lucide-react"
import { sectionShell, sectionY } from "./sectionShell"

export type StepItem = {
  icon?: LucideIcon
  title: string
  copy: string
}

type StepsSectionProps = {
  sectionId: string
  heading: string
  steps: StepItem[]
  className?: string
}

export default function StepsSection({
  sectionId,
  heading,
  steps,
  className = "bg-background"
}: StepsSectionProps) {
  return (
    <section className={`${sectionY} ${className}`} aria-labelledby={sectionId}>
      <div className={sectionShell}>
        <h2
          id={sectionId}
          className="text-center text-3xl font-bold md:text-4xl lg:text-left"
        >
          {heading}
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, copy }, i) => (
            <div key={title} className="text-center lg:text-left">
              {Icon ? (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-foreground ring-1 ring-border lg:mx-0">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary lg:mx-0">
                  {i + 1}
                </div>
              )}
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
