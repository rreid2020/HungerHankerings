import type { ReactNode } from "react"
import { sectionShell, sectionY } from "./sectionShell"

type ServiceHeroProps = {
  id?: string
  eyebrow?: string
  title: string
  subtitle: string
  children?: ReactNode
  imageSrc?: string
  imageAlt?: string
  /** Applied to the hero image (e.g. object-contain for SVG illustrations). */
  imageClassName?: string
}

export default function ServiceHero({
  id = "service-hero",
  eyebrow,
  title,
  subtitle,
  children,
  imageSrc = "https://placehold.co/800x800/F7E1D7/4A5759?text=Snack+Program",
  imageAlt = "Corporate snack program",
  imageClassName = "h-full w-full object-cover"
}: ServiceHeroProps) {
  return (
    <section className={`${sectionY} bg-background`} aria-labelledby={id}>
      <div className={sectionShell}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <header className="space-y-6">
            {eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1
              id={id}
              className="text-4xl font-bold tracking-tight text-foreground md:text-5xl"
            >
              {title}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
              {subtitle}
            </p>
            {children ? <div className="flex flex-wrap gap-3 pt-2">{children}</div> : null}
          </header>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
              <img
                src={imageSrc}
                alt={imageAlt}
                className={imageClassName}
                width={800}
                height={800}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
