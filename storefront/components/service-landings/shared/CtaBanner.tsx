import type { ReactNode } from "react"
import { sectionShell, sectionY } from "./sectionShell"

type CtaBannerProps = {
  sectionId: string
  title: string
  description: string
  children: ReactNode
}

export default function CtaBanner({
  sectionId,
  title,
  description,
  children
}: CtaBannerProps) {
  return (
    <section
      className={`${sectionY} bg-iron_grey text-white`}
      aria-labelledby={sectionId}
    >
      <div className={`${sectionShell} text-center`}>
        <h2 id={sectionId} className="text-3xl font-bold md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-white/85 md:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </section>
  )
}
