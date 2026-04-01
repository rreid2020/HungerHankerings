import { sectionShell, sectionY } from "./sectionShell"

type IntroSectionProps = {
  sectionId: string
  title: string
  body: string
  className?: string
}

export default function IntroSection({
  sectionId,
  title,
  body,
  className = "bg-background"
}: IntroSectionProps) {
  return (
    <section
      className={`${sectionY} ${className}`}
      aria-labelledby={sectionId}
    >
      <div className={`${sectionShell} max-w-3xl`}>
        <h2 id={sectionId} className="text-3xl font-bold text-foreground md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </section>
  )
}
