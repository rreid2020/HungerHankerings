/*
Suggested metadata (use in route export const metadata):
{
  "title": "Corporate Team Snack Boxes Canada | Employee & Client Gifting",
  "description": "Corporate team snack boxes delivered across Canada. Curated boxes for remote teams, onboarding, appreciation, and client gifting—with custom branding and flexible orders.",
  "keywords": ["corporate snack boxes Canada", "team snack delivery", "employee gift boxes", "client gifting snacks"]
}
*/

import Link from "next/link"
import {
  Briefcase,
  Gift,
  HeartHandshake,
  Home,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Truck
} from "lucide-react"
import Button from "../Button"
import CtaBanner from "./shared/CtaBanner"
import { teamSnackFaqItems } from "../../data/serviceAndCorporateFaqs"
import FaqSection from "./shared/FaqSection"
import IconCardGrid from "./shared/IconCardGrid"
import IntroSection from "./shared/IntroSection"
import { onDarkOutlineLinkClass } from "./shared/onDarkOutline"
import ServiceHero from "./shared/ServiceHero"
import StepsSection from "./shared/StepsSection"

const perfectForItems = [
  {
    icon: Home,
    title: "Remote & hybrid teams",
    description:
      "Ship directly to home offices or hubs so every teammate gets the same great experience."
  },
  {
    icon: Gift,
    title: "Employee appreciation",
    description:
      "Recognize milestones, holidays, and wins with snack boxes people actually want to open."
  },
  {
    icon: Briefcase,
    title: "Client & partner gifting",
    description:
      "Leave a memorable impression with branded touches and curated assortments."
  },
  {
    icon: HeartHandshake,
    title: "Onboarding & culture",
    description:
      "Welcome new hires and reinforce culture with a shareable, feel-good unboxing moment."
  }
] as const

const whyChooseItems = [
  {
    icon: Truck,
    title: "Canada-wide delivery",
    description:
      "Reliable shipping from coast to coast—individual addresses or batched to your office."
  },
  {
    icon: Palette,
    title: "Custom branding",
    description:
      "Logo cards, messaging, and packaging options to match your brand."
  },
  {
    icon: Package,
    title: "Flexible orders",
    description:
      "One-time drops, recurring programs, and volumes that scale with your team."
  },
  {
    icon: Sparkles,
    title: "Curated snacks",
    description:
      "Trend-forward mixes with dietary options including vegan, gluten-free, and nut-aware."
  }
] as const

const howSteps = [
  {
    icon: MessageSquare,
    title: "Tell us your goals",
    copy: "Team size, delivery preferences, dietary needs, and timeline."
  },
  {
    icon: SlidersHorizontal,
    title: "We shape the program",
    copy: "Snack selection, branding, and quantities tailored to your budget."
  },
  {
    icon: MapPin,
    title: "We deliver across Canada",
    copy: "We pack and ship so your recipients get a consistent experience."
  },
  {
    icon: Sparkles,
    title: "You enjoy the results",
    copy: "Happier teams, stronger relationships, and zero logistics headaches."
  }
] as const

export default function TeamSnackBoxesPage() {
  return (
    <div className="bg-background text-foreground">
      <ServiceHero
        id="team-snack-hero-heading"
        eyebrow="Team snack boxes"
        title="Corporate Team Snack Boxes Delivered Across Canada"
        subtitle="Reward and retain your team with curated snack boxes delivered Canada-wide. We handle sourcing, packing, and shipping so your team gets a consistent snack experience—from onboarding to appreciation."
        imageSrc="/illustration-team-snack-boxes.svg"
        imageAlt="Stylized gift boxes and delivery routes suggesting team snack gifting"
        imageClassName="h-full w-full object-contain object-center p-3 sm:p-4"
      >
        <Button href="/team-snacks-delivered" className="min-h-11 px-6">
          Request a Custom Quote
        </Button>
        <Button href="/shop" variant="ghost" className="min-h-11 border border-border px-6">
          Explore Snack Box Options
        </Button>
      </ServiceHero>

      <IntroSection
        sectionId="team-intro-heading"
        title="Snack Boxes Your Team Will Actually Love"
        body="Orders start at $42.99 including shipping, with flexible one-time or recurring drops. Add a custom logo card, choose dietary-friendly mixes, and let us worry about fulfillment while you focus on your people."
        className="bg-powder_petal-50/60"
      />

      <IconCardGrid
        sectionId="team-perfect-for-heading"
        heading="Perfect for"
        intro="Corporate snack programs that fit how your team works today."
        items={[...perfectForItems]}
      />

      <IconCardGrid
        sectionId="team-why-heading"
        heading="Why choose us"
        intro="Built for modern teams that need reliability, branding, and great taste."
        items={[...whyChooseItems]}
        className="bg-background"
      />

      <StepsSection
        sectionId="team-how-heading"
        heading="How it works"
        steps={[...howSteps]}
        className="border-y border-border bg-muted/30"
      />

      <FaqSection
        sectionId="team-faq-heading"
        items={teamSnackFaqItems}
        className="bg-background"
      />

      <CtaBanner
        sectionId="team-cta-heading"
        title="Ready to send your next snack drop?"
        description="Request a quote for team snack boxes with custom branding and Canada-wide delivery."
      >
        <Button
          href="/team-snacks-delivered"
          className="min-h-11 bg-primary px-8 text-primary-foreground hover:bg-primary-hover"
        >
          Request a Custom Quote
        </Button>
        <Link href="/shop" className={onDarkOutlineLinkClass}>
          Explore Snack Box Options
        </Link>
      </CtaBanner>
    </div>
  )
}
