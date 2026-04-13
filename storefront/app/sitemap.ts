import type { MetadataRoute } from "next";
import { listProducts } from "../lib/vendure";
import { getSiteOrigin } from "../lib/site";

export const dynamic = "force-dynamic";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

const STATIC_PATHS: { path: string; changeFrequency: ChangeFrequency; priority: number }[] =
  [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/shop", changeFrequency: "weekly", priority: 0.95 },
    { path: "/themed-snack-boxes", changeFrequency: "monthly", priority: 0.9 },
    { path: "/faqs", changeFrequency: "monthly", priority: 0.85 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.8 },
    { path: "/fundraising", changeFrequency: "monthly", priority: 0.8 },
    { path: "/gift-a-box", changeFrequency: "weekly", priority: 0.85 },
    { path: "/our-programs", changeFrequency: "monthly", priority: 0.9 },
    { path: "/team-snacks-delivered", changeFrequency: "monthly", priority: 0.85 },
    { path: "/office-pantry-snack-service", changeFrequency: "monthly", priority: 0.85 },
    { path: "/corporate/team-snack-boxes", changeFrequency: "monthly", priority: 0.85 },
    { path: "/corporate/office-snack-pantry", changeFrequency: "monthly", priority: 0.85 },
    { path: "/corporate/bulk-pallet", changeFrequency: "monthly", priority: 0.85 }
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority
  }));

  try {
    const products = await listProducts();
    for (const p of products) {
      if (!p.slug) continue;
      entries.push({
        url: `${base}/products/${encodeURIComponent(p.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75
      });
    }
  } catch {
    /* Vendure unavailable (e.g. build without API); static URLs still listed */
  }

  return entries;
}
