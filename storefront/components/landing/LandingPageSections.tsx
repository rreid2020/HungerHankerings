import Link from "next/link"
import {
  Gift,
  Leaf,
  PartyPopper,
  Ruler,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck
} from "lucide-react"
import { stripHtml } from "../../lib/html"
import type { StorefrontProduct } from "../../lib/vendure"

/** Curated grid order on /themed-snack-boxes; must match Vendure product slugs. */
const LANDING_FEATURED_SLUG_ORDER = [
  "movie-night-snack-box",
  "classic-guilt-free-box",
  "guilt-free-movie-night-box",
  "all-canadian-snack-box",
  "munchies-snack-box",
  "vegan-gluten-free-snack-box"
] as const

/**
 * When Admin slug differs from the landing slot key, list alternates here so the
 * grid still resolves the product (image + PDP link use the real slug).
 */
const LANDING_SLOT_ALT_SLUGS: Partial<
  Record<(typeof LANDING_FEATURED_SLUG_ORDER)[number], readonly string[]>
> = {
  "guilt-free-movie-night-box": [
    "guilt-free-movie-night-snack-box",
    "guilt-free-movie-night",
    "guilt-free-movie-night-snackbox"
  ],
  "munchies-snack-box": ["munchies-box"]
}

const LANDING_FEATURED_FALLBACK: Record<
  (typeof LANDING_FEATURED_SLUG_ORDER)[number],
  { name: string; description: string; imageUrl: string }
> = {
  "movie-night-snack-box": {
    name: "Movie Night Snack Box",
    description: "The ultimate mix of sweet and savory for movie nights",
    imageUrl: "https://placehold.co/600x600/e8dfd7/4A5759?text=Movie+Night"
  },
  "classic-guilt-free-box": {
    name: "Classic Guilt-Free Box",
    description: "Better-for-you snacks without sacrificing flavor",
    imageUrl: "https://placehold.co/600x600/d4e3d5/4A5759?text=Guilt-Free"
  },
  "guilt-free-movie-night-box": {
    name: "Guilt-Free Movie Night Box",
    description: "Enjoy movie night with healthier snack options",
    imageUrl: "https://placehold.co/600x600/edafb8/4A5759?text=GF+Movie"
  },
  "all-canadian-snack-box": {
    name: "All Canadian Snack Box",
    description: "A curated selection of iconic Canadian treats",
    imageUrl: "https://placehold.co/600x600/DEDBD2/4A5759?text=Canadian"
  },
  "munchies-snack-box": {
    name: "Munchies Snack Box",
    description: "Loaded with bold, crave-worthy snacks",
    imageUrl: "https://placehold.co/600x600/f7e1d7/4A5759?text=Munchies"
  },
  "vegan-gluten-free-snack-box": {
    name: "Vegan & Gluten-Free Snack Box",
    description: "Delicious snacks tailored for dietary needs",
    imageUrl: "https://placehold.co/600x600/b0c4b1/4A5759?text=Vegan+GF"
  }
}

export type LandingFeaturedBox = {
  name: string
  href: string
  description: string
  imageUrl: string
}

function findProductForLandingSlot(
  bySlug: Map<string, StorefrontProduct>,
  slotSlug: (typeof LANDING_FEATURED_SLUG_ORDER)[number]
): StorefrontProduct | undefined {
  const direct = bySlug.get(slotSlug)
  if (direct) return direct
  const alts = LANDING_SLOT_ALT_SLUGS[slotSlug]
  if (!alts?.length) return undefined
  for (const s of alts) {
    const hit = bySlug.get(s)
    if (hit) return hit
  }
  const lowerAlts = new Set(alts.map((s) => s.toLowerCase()))
  for (const [key, prod] of bySlug) {
    if (lowerAlts.has(key.toLowerCase())) return prod
  }
  return undefined
}

/** Merge Vendure catalog (thumbnails + copy) with fixed landing order and placeholders when missing. */
export function buildLandingFeaturedBoxes(products: StorefrontProduct[]): LandingFeaturedBox[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  return LANDING_FEATURED_SLUG_ORDER.map((slug) => {
    const fb = LANDING_FEATURED_FALLBACK[slug]
    const p = findProductForLandingSlot(bySlug, slug)
    const href = p ? `/products/${encodeURIComponent(p.slug)}` : `/products/${encodeURIComponent(slug)}`
    if (p) {
      const fromDesc = stripHtml(p.description ?? "").trim()
      return {
        name: p.name,
        href,
        description: fromDesc || fb.description,
        imageUrl: (p.thumbnail?.url && p.thumbnail.url.length > 0 ? p.thumbnail.url : null) || fb.imageUrl
      }
    }
    return { name: fb.name, href, description: fb.description, imageUrl: fb.imageUrl }
  })
}

const valueProps = [
  {
    icon: Sparkles,
    title: "Curated for Every Occasion",
    body: "Thoughtfully designed snack experiences for any moment"
  },
  {
    icon: Gift,
    title: "Perfect for Gifting 🎁",
    body: "A ready-to-enjoy gift anyone will love"
  },
  {
    icon: Leaf,
    title: "Options for Every Lifestyle",
    body: "Classic, healthy, vegan, and gluten-free choices"
  },
  {
    icon: Truck,
    title: "Canada-Wide Delivery 🇨🇦",
    body: "Fast and reliable shipping across Canada"
  }
] as const

const howSteps = [
  { icon: ShoppingBag, label: "Pick Your Box" },
  { icon: Ruler, label: "Select Your Size" },
  { icon: ShoppingCart, label: "Add to Cart" },
  { icon: PartyPopper, label: "Enjoy the Experience" }
] as const

const linkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"

const sectionInner = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

const DEFAULT_HERO_IMAGE =
  "https://placehold.co/800x800/F7E1D7/4A5759?text=Themed+Snack+Box"

type LandingPageSectionsProps = {
  featuredBoxes: LandingFeaturedBox[]
}

export default function LandingPageSections({ featuredBoxes }: LandingPageSectionsProps) {
  const heroImageUrl = featuredBoxes[0]?.imageUrl ?? DEFAULT_HERO_IMAGE

  return (
    <div className="bg-background text-foreground">
      <section className="py-16 md:py-20" aria-labelledby="landing-hero-heading">
        <div className={sectionInner}>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <h1
                id="landing-hero-heading"
                className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-tight"
              >
                Snack Boxes for Every Craving
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                From cozy movie nights to thoughtful gifts and little moments of
                indulgence—discover snack boxes made to match the mood.
              </p>
              <Link
                href="/shop"
                className={`inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${linkFocus}`}
              >
                Shop Snack Boxes
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
                <img
                  src={heroImageUrl}
                  alt={
                    featuredBoxes[0]?.name
                      ? `${featuredBoxes[0].name} — themed snack box`
                      : "Assorted themed snack box with colorful packaging"
                  }
                  className="h-full w-full object-cover"
                  width={800}
                  height={800}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40 py-16 md:py-20" aria-labelledby="value-props-heading">
        <div className={sectionInner}>
          <h2 id="value-props-heading" className="sr-only">
            Why choose our snack boxes
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="featured-snack-boxes"
        className="scroll-mt-20 py-16 md:py-20"
        aria-labelledby="featured-heading"
      >
        <div className={sectionInner}>
          <div className="mb-10 max-w-2xl">
            <h2 id="featured-heading" className="text-3xl font-bold tracking-tight md:text-4xl">
              Featured snack boxes
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Tap a box to see details, sizes, and what&apos;s inside.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredBoxes.map((p) => (
              <article
                key={p.href}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="aspect-square w-full shrink-0 overflow-hidden bg-muted">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    width={600}
                    height={600}
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                  <p className="mt-2 min-h-[2.75rem] flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                  <a
                    href={p.href}
                    className={`mt-5 inline-flex w-full items-center justify-center rounded-full border-2 border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition duration-300 hover:bg-primary/90 ${linkFocus}`}
                  >
                    View Box
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="how-it-works-heading">
        <div className={sectionInner}>
          <h2
            id="how-it-works-heading"
            className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-left"
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {howSteps.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center text-center lg:items-start lg:text-left"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-foreground ring-2 ring-border">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-gradient-to-b from-powder_petal-50 via-powder_petal-50/50 to-background py-20 md:py-24"
        aria-labelledby="moments-heading"
      >
        <div className={`${sectionInner} max-w-3xl text-center`}>
          <h2 id="moments-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Made for Moments That Matter
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
            Whether you&apos;re dimming the lights for movie night, surprising someone who
            deserves a treat, or carving out a little &ldquo;you time&rdquo;—our boxes are
            built to feel generous, welcoming, and a touch special. Unwrap something
            worth savoring, together or solo.
          </p>
        </div>
      </section>
    </div>
  )
}
