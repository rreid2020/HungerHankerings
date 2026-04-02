/*
Suggested metadata (use in route export const metadata):
{
  "title": "Bulk Snack Boxes & Pallet Delivery Canada | Corporate High-Volume Orders",
  "description": "Bulk snack boxes and pallet delivery for corporate orders—custom configurations, themed or healthy mixes, and centralized delivery across Canada.",
  "keywords": ["bulk snack boxes Canada", "pallet snack delivery", "corporate bulk orders", "custom snack boxes wholesale"]
}
*/

import Link from "next/link"
import {
  Boxes,
  Factory,
  Layers,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Warehouse
} from "lucide-react"
import Button from "../Button"
import CtaBanner from "./shared/CtaBanner"
import { bulkPalletFaqItems } from "../../data/serviceAndCorporateFaqs"
import FaqSection from "./shared/FaqSection"
import IconCardGrid from "./shared/IconCardGrid"
import IntroSection from "./shared/IntroSection"
import { onDarkOutlineLinkClass } from "./shared/onDarkOutline"
import ServiceHero from "./shared/ServiceHero"
import StepsSection from "./shared/StepsSection"

const perfectForItems = [
  {
    icon: Factory,
    title: "National rollouts",
    description:
      "Ship hundreds or thousands of identical boxes to one hub for redistribution."
  },
  {
    icon: Warehouse,
    title: "Central distribution",
    description:
      "Perfect when your logistics team receives pallets and breaks them down internally."
  },
  {
    icon: Boxes,
    title: "Campaigns & launches",
    description:
      "Product drops, seasonal gifts, and conference swag—scaled without DIY packing."
  },
  {
    icon: Package,
    title: "Franchise & multi-site",
    description:
      "Repeatable box builds with consistent contents and labeling across locations."
  }
] as const

const customizationItems = [
  {
    icon: Layers,
    title: "Box sizes & configurations",
    description:
      "Choose dimensions and pack counts that match how you’ll hand off or ship downstream."
  },
  {
    icon: Palette,
    title: "Snack profiles",
    description:
      "Indulgent, healthy, themed, or mixed assortments aligned to your audience."
  },
  {
    icon: Sparkles,
    title: "Branding & inserts",
    description:
      "Logo sleeves, cards, and messaging for a cohesive unboxing experience."
  },
  {
    icon: Truck,
    title: "Delivery model",
    description:
      "Palletized to your dock or coordinated drops—structured around your receiving windows."
  }
] as const

const whyChooseItems = [
  {
    icon: Package,
    title: "Volume without chaos",
    description:
      "We plan production and packing so large orders don’t derail your internal team."
  },
  {
    icon: SlidersHorizontal,
    title: "Built to spec",
    description:
      "Configurations and contents documented so reorders stay consistent."
  },
  {
    icon: MapPin,
    title: "Canada-wide execution",
    description:
      "Coordinate fulfillment with your Canadian distribution strategy."
  },
  {
    icon: MessageSquare,
    title: "Direct partnership",
    description:
      "Clear timelines, proactive updates, and a single point of contact."
  }
] as const

const howSteps = [
  {
    icon: MessageSquare,
    title: "Define scope",
    copy: "Volumes, timeline, destination type, and any branding requirements."
  },
  {
    icon: SlidersHorizontal,
    title: "Design the build",
    copy: "Snack mix, box format, inserts, and pallet or shipment structure."
  },
  {
    icon: Package,
    title: "Produce & pack",
    copy: "Quality-controlled assembly at the scale you need."
  },
  {
    icon: Truck,
    title: "Deliver in bulk",
    copy: "Centralized arrival so your team controls the last mile."
  }
] as const

export default function BulkPalletServicePage() {
  return (
    <div className="bg-background text-foreground">
      <ServiceHero
        id="bulk-pallet-hero-heading"
        eyebrow="Bulk & pallet"
        title="Bulk Snack Boxes & Pallet Delivery for Corporate Orders"
        subtitle="High-volume, fully customized snack box programs delivered to a central location—ideal when you need consistency at scale and your team handles downstream distribution."
        imageSrc="https://placehold.co/800x800/DEDBD2/4A5759?text=Bulk+%26+Pallet"
        imageAlt="Bulk pallet snack box delivery for corporate high-volume orders"
      >
        <Button href="/contact" className="min-h-11 px-6">
          Get Bulk Pricing &amp; Custom Options
        </Button>
        <Button href="/contact" variant="ghost" className="min-h-11 border border-border px-6">
          Speak With Our Team
        </Button>
      </ServiceHero>

      <IntroSection
        sectionId="bulk-intro-heading"
        title="High-Volume Snack Box Solutions Made Easy"
        body="Whether you’re staging a national campaign or stocking internal distribution, we help you lock in snack selection, packaging, and pallet structure—so large orders feel as controlled as small ones."
        className="bg-powder_petal-50/60"
      />

      <IconCardGrid
        sectionId="bulk-perfect-for-heading"
        heading="Perfect for"
        intro="Organizations that need one trusted build, many units, and a single inbound delivery."
        items={[...perfectForItems]}
      />

      <IconCardGrid
        sectionId="bulk-custom-heading"
        heading="Customization options"
        intro="Mix and match levers until the program fits your operations and brand."
        items={[...customizationItems]}
        className="bg-background"
      />

      <IconCardGrid
        sectionId="bulk-why-heading"
        heading="Why choose us"
        intro="Less guesswork, fewer vendors, and a partner who understands corporate timelines."
        items={[...whyChooseItems]}
        className="border-y border-border bg-muted/40"
      />

      <StepsSection
        sectionId="bulk-how-heading"
        heading="How it works"
        steps={[...howSteps]}
        className="bg-background"
      />

      <FaqSection
        sectionId="bulk-faq-heading"
        items={bulkPalletFaqItems}
        className="border-t border-border bg-muted/30"
      />

      <CtaBanner
        sectionId="bulk-cta-heading"
        title="Planning a large snack box order?"
        description="Share volumes, timing, and customization goals—we’ll follow up with options and pricing."
      >
        <Button
          href="/contact"
          className="min-h-11 bg-primary px-8 text-primary-foreground hover:bg-primary-hover"
        >
          Get Bulk Pricing &amp; Custom Options
        </Button>
        <Link href="/contact" className={onDarkOutlineLinkClass}>
          Speak With Our Team
        </Link>
      </CtaBanner>
    </div>
  )
}
