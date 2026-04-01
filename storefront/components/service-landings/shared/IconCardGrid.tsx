import type { LucideIcon } from "lucide-react"
import { sectionShell, sectionY } from "./sectionShell"

export type IconCardItem = {
  icon: LucideIcon
  title: string
  description: string
}

type IconCardGridProps = {
  sectionId: string
  heading: string
  intro?: string
  items: IconCardItem[]
  className?: string
  columnsClass?: string
}

export default function IconCardGrid({
  sectionId,
  heading,
  intro,
  items,
  className = "border-y border-border bg-muted/40",
  columnsClass = "sm:grid-cols-2 lg:grid-cols-4"
}: IconCardGridProps) {
  return (
    <section className={`${sectionY} ${className}`} aria-labelledby={sectionId}>
      <div className={sectionShell}>
        <h2 id={sectionId} className="text-center text-3xl font-bold md:text-4xl">
          {heading}
        </h2>
        {intro ? (
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            {intro}
          </p>
        ) : null}
        <div className={`mt-12 grid grid-cols-1 gap-6 ${columnsClass}`}>
          {items.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
