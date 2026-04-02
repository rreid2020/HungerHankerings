/*
Suggested metadata (use in route export const metadata):
{
  "title": "Office Snack Pantry Service Canada | Workplace Snack Delivery",
  "description": "Office snack pantry service for modern workplaces—full-service stocking, curated assortments, flexible schedules, and dedicated support across Canada.",
  "keywords": ["office snack pantry", "workplace snacks Canada", "office snack delivery", "corporate pantry service"]
}
*/

import Link from "next/link"
import {
  Building2,
  Coffee,
  Headphones,
  Leaf,
  MapPin,
  MessageSquare,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Users
} from "lucide-react"
import Button from "../Button"
import CtaBanner from "./shared/CtaBanner"
import { officePantryFaqItems } from "../../data/serviceAndCorporateFaqs"
import FaqSection from "./shared/FaqSection"
import IconCardGrid from "./shared/IconCardGrid"
import IntroSection from "./shared/IntroSection"
import { onDarkOutlineLinkClass } from "./shared/onDarkOutline"
import ServiceHero from "./shared/ServiceHero"
import StepsSection from "./shared/StepsSection"

const perfectForItems = [
  {
    icon: Building2,
    title: "Growing companies",
    description:
      "Scale pantry coverage as headcount increases—without adding admin work for HR."
  },
  {
    icon: Users,
    title: "Hybrid workplaces",
    description:
      "Keep the office tempting for in-office days with snacks people look forward to."
  },
  {
    icon: Coffee,
    title: "Culture & perks",
    description:
      "Turn the break room into a place where people connect between meetings."
  },
  {
    icon: Leaf,
    title: "Wellness-forward teams",
    description:
      "Balance indulgent picks with better-for-you options and clear dietary variety."
  }
] as const

const whatsIncludedItems = [
  {
    icon: Sparkles,
    title: "Curated assortments",
    description:
      "Trend-driven mixes updated regularly so the pantry never feels stale."
  },
  {
    icon: RefreshCw,
    title: "Restocking on your schedule",
    description:
      "Weekly, bi-weekly, or monthly cadence matched to consumption and seasonality."
  },
  {
    icon: Headphones,
    title: "Dedicated support",
    description:
      "A partner who adjusts the plan based on feedback and usage."
  },
  {
    icon: MapPin,
    title: "Canada-wide programs",
    description:
      "Coordinate one program across offices or regions with consistent quality."
  }
] as const

const whyCompaniesItems = [
  {
    icon: Users,
    title: "Morale & retention",
    description:
      "Small perks add up—snacks are one of the easiest ways to show you care."
  },
  {
    icon: Sparkles,
    title: "Productivity friendly",
    description:
      "Fewer mid-day trips out of the office means more focus time for your team."
  },
  {
    icon: SlidersHorizontal,
    title: "Flexible scope",
    description:
      "Start with a single floor or location and expand as you prove ROI."
  },
  {
    icon: Leaf,
    title: "Dietary variety",
    description:
      "Options for common dietary needs so everyone can grab something confidently."
  }
] as const

const howSteps = [
  {
    icon: MessageSquare,
    title: "We assess your needs",
    copy: "Headcount, space, budget, and how your team uses the pantry today."
  },
  {
    icon: SlidersHorizontal,
    title: "We design the mix",
    copy: "Snack assortment, rotation plan, and restock rhythm tailored to you."
  },
  {
    icon: RefreshCw,
    title: "We stock & maintain",
    copy: "Deliveries, resets, and adjustments based on what actually moves."
  },
  {
    icon: Sparkles,
    title: "You enjoy the upside",
    copy: "A break room that feels intentional—without running it yourself."
  }
] as const

export default function OfficeSnackPantryPage() {
  return (
    <div className="bg-background text-foreground">
      <ServiceHero
        id="office-pantry-hero-heading"
        eyebrow="Office pantry"
        title="Office Snack Pantry Service for Modern Workplaces"
        subtitle="We curate, restock, and manage pantry snacks so your team always has something fresh and trendy—without your ops team living in the supply closet."
        imageSrc="/office-pantry.png"
        imageAlt="Modern office pantry with coffee station, snacks, and seating"
      >
        <Button href="/office-pantry-snack-service" className="min-h-11 px-6">
          Request Pantry Service Info
        </Button>
        <Button href="/team-snacks-delivered" variant="ghost" className="min-h-11 border border-border px-6">
          Get a Custom Quote
        </Button>
      </ServiceHero>

      <IntroSection
        sectionId="office-intro-heading"
        title="Upgrade Your Office Snack Experience"
        body="Easy access to great snacks does more than feed your office—it feeds culture. We handle curation and restocking so you get a modern pantry program with ongoing variety, not a one-off delivery."
        className="bg-powder_petal-50/60"
      />

      <IconCardGrid
        sectionId="office-perfect-for-heading"
        heading="Perfect for"
        intro="Workplaces that want the perk without the operational drag."
        items={[...perfectForItems]}
      />

      <IconCardGrid
        sectionId="office-included-heading"
        heading="What’s included"
        intro="Everything you need for a pantry that feels premium and runs smoothly."
        items={[...whatsIncludedItems]}
        className="bg-background"
      />

      <IconCardGrid
        sectionId="office-why-heading"
        heading="Why companies choose us"
        intro="A partner-led pantry beats ad-hoc buying—better variety, less waste, and a program that improves over time."
        items={[...whyCompaniesItems]}
        className="border-y border-border bg-muted/40"
      />

      <StepsSection
        sectionId="office-how-heading"
        heading="How it works"
        steps={[...howSteps]}
        className="bg-powder_petal-50/40"
      />

      <FaqSection
        sectionId="office-faq-heading"
        items={officePantryFaqItems}
        className="border-t border-border bg-muted/30"
      />

      <CtaBanner
        sectionId="office-cta-heading"
        title="Ready to modernize your office pantry?"
        description="Tell us about your space and team—we’ll recommend a plan and restock cadence."
      >
        <Button
          href="/office-pantry-snack-service"
          className="min-h-11 bg-primary px-8 text-primary-foreground hover:bg-primary-hover"
        >
          Request Pantry Service Info
        </Button>
        <Link href="/team-snacks-delivered" className={onDarkOutlineLinkClass}>
          Get a Custom Quote
        </Link>
      </CtaBanner>
    </div>
  )
}
