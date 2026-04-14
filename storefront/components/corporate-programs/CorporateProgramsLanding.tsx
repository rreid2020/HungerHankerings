/*
 * SEO (mirror in page metadata):
 * Title: Corporate Snack Programs | Office Snack Delivery Canada | Hunger Hankerings
 * Description: Corporate snack programs and office snack delivery across Canada.
 *   Corporate gift snack boxes, bulk snack boxes Canada, custom branding, and pantry
 *   service for teams of any size.
 */

import {
  Gift,
  Heart,
  MapPin,
  MessageSquare,
  Palette,
  SlidersHorizontal,
  Truck,
  Users
} from "lucide-react"
import Button from "../Button"
import { contactQuoteHref } from "../../lib/contact-inquiry"

const sectionShell = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

const valueProps = [
  {
    icon: Gift,
    title: "Effortless Team Gifting",
    description:
      "Send snack boxes your employees and clients will actually enjoy—perfect for remote teams, onboarding, and appreciation."
  },
  {
    icon: Palette,
    title: "Custom Branding Options 🎁",
    description:
      "Add your logo, messaging, and fully customized packaging for a branded experience."
  },
  {
    icon: Users,
    title: "Flexible for Any Team Size",
    description: "From small teams to enterprise-scale orders, we grow with you."
  },
  {
    icon: Truck,
    title: "Canada-Wide Delivery 🇨🇦",
    description:
      "Ship to individual addresses, offices, or central warehouses with ease."
  }
] as const

const howSteps = [
  {
    icon: MessageSquare,
    title: "Tell Us What You Need",
    copy: "Share your team size, delivery preferences, and goals"
  },
  {
    icon: SlidersHorizontal,
    title: "We Customize Your Program",
    copy: "From snack selection to packaging and quantities"
  },
  {
    icon: MapPin,
    title: "We Deliver Across Canada",
    copy: "Individual shipping or bulk delivery"
  },
  {
    icon: Heart,
    title: "You Enjoy the Impact",
    copy: "Happier teams, smoother logistics, zero hassle"
  }
] as const

export default function CorporateProgramsLanding() {
  return (
    <div className="bg-background text-foreground">
      <section className="py-16 md:py-20" aria-labelledby="corp-hero-heading">
        <div className={sectionShell}>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <header className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Corporate snack programs
              </p>
              <h1
                id="corp-hero-heading"
                className="text-4xl font-bold tracking-tight text-foreground md:text-5xl"
              >
                Snack Programs for Teams
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Make it easy to fuel your team, delight your clients, and create memorable
                experiences—without the hassle.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Our corporate snack programs are built for modern teams—from curated snack
                boxes to fully customized bulk snack boxes in Canada. Flexible, scalable,
                and delivered with reliable office snack delivery across Canada for
                corporate gift snack boxes and bulk orders.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button href={contactQuoteHref("corporate-programs")} className="min-h-11 px-6">
                  Request a Custom Quote
                </Button>
              </div>
            </header>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                <img
                  src="https://placehold.co/800x800/DEDBD2/4A5759?text=Corporate+Snacks"
                  alt="Corporate snack program assortment for office and team gifting"
                  className="h-full w-full object-cover"
                  width={800}
                  height={800}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-y border-border bg-muted/40 py-16 md:py-20"
        aria-labelledby="corp-value-heading"
      >
        <div className={sectionShell}>
          <h2 id="corp-value-heading" className="text-center text-3xl font-bold md:text-4xl">
            Why companies choose us
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Office snack delivery Canada-wide, corporate gift snack boxes, and programs
            that scale with your team.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map(({ icon: Icon, title, description }) => (
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

      <section className="py-16 md:py-20" aria-labelledby="corp-programs-heading">
        <div className={sectionShell}>
          <h2 id="corp-programs-heading" className="text-3xl font-bold md:text-4xl">
            Corporate snack programs
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
            Three ways to bring bulk snack boxes Canada and branded experiences to your
            workplace—choose what fits your logistics and goals.
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:items-stretch">
            <article className="flex h-full min-h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition duration-300 hover:shadow-lg">
              <h3 className="text-xl font-bold text-foreground">Team Snack Boxes</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Send curated snack boxes directly to your team or clients—wherever they
                are.
              </p>
              <ul className="mt-6 flex-1 list-outside list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground">
                <li className="pl-1">Ideal for remote &amp; hybrid teams</li>
                <li className="pl-1">Perfect for onboarding, holidays, and employee appreciation</li>
                <li className="pl-1">Custom branding available</li>
              </ul>
              <div className="mt-auto pt-8">
                <Button href="/corporate/team-snack-boxes" className="w-full sm:w-auto">
                  Explore Team Snack Boxes
                </Button>
              </div>
            </article>
            <article className="flex h-full min-h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition duration-300 hover:shadow-lg">
              <h3 className="text-xl font-bold text-foreground">Office Snack Pantry Service</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Keep your workplace stocked with snacks your team will actually love.
              </p>
              <ul className="mt-6 flex-1 list-outside list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground">
                <li className="pl-1">Full-service pantry stocking</li>
                <li className="pl-1">Trend-driven, curated snack assortments</li>
                <li className="pl-1">Flexible delivery schedules and ongoing support</li>
              </ul>
              <div className="mt-auto pt-8">
                <Button href="/corporate/office-snack-pantry" className="w-full sm:w-auto">
                  Learn More About Pantry Service
                </Button>
              </div>
            </article>
            <article className="flex h-full min-h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-sm transition duration-300 hover:shadow-lg">
              <h3 className="text-xl font-bold text-foreground">
                Bulk &amp; Pallet Snack Box Service
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our pallet service is built for companies that need high-volume, fully
                customized snack box orders delivered to a central location.
              </p>
              <ul className="mt-6 flex-1 list-outside list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground">
                <li className="pl-1">Fully customized box sizes and configurations</li>
                <li className="pl-1">Choose snack types (indulgent, healthy, themed)</li>
                <li className="pl-1">Scalable to hundreds or thousands of boxes</li>
                <li className="pl-1">Delivered in bulk to one destination</li>
              </ul>
              <div className="mt-auto pt-8">
                <Button href={contactQuoteHref("bulk-pallet")} className="w-full sm:w-auto">
                  Request Bulk Order Quote
                </Button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-powder_petal-50/80 py-16 md:py-20" aria-labelledby="corp-how-heading">
        <div className={sectionShell}>
          <h2 id="corp-how-heading" className="text-center text-3xl font-bold md:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {howSteps.map(({ icon: Icon, title, copy }, i) => (
              <div key={title} className="relative text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border lg:mx-0">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
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

      <section className="py-16 md:py-20" aria-labelledby="corp-brand-heading">
        <div className={`${sectionShell} max-w-3xl text-center`}>
          <h2 id="corp-brand-heading" className="text-3xl font-bold md:text-4xl">
            Built for Modern Teams
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Whether you&apos;re sending gifts to remote employees, stocking your office,
            or managing large-scale distribution, our snack programs help you create
            meaningful experiences—at any scale.
          </p>
          <p className="mt-4 text-lg font-medium text-foreground">
            Because great teams deserve great snacks.
          </p>
        </div>
      </section>

      <section
        className="bg-iron_grey py-16 text-white md:py-20"
        aria-labelledby="corp-final-cta-heading"
      >
        <div className={`${sectionShell} text-center`}>
          <h2 id="corp-final-cta-heading" className="text-3xl font-bold md:text-4xl">
            Ready to build your corporate snack program?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/85 md:text-base">
            Get a custom quote for team boxes, pantry service, or bulk snack boxes
            Canada-wide.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              href={contactQuoteHref("corporate-programs")}
              className="min-h-11 bg-primary px-8 text-primary-foreground hover:bg-primary-hover"
            >
              Request a Custom Quote
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
