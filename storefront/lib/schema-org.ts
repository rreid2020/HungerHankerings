const CTX = "https://schema.org";

export type FaqSchemaPair = { question: string; answer: string };

export function faqPageJsonLd(items: FaqSchemaPair[]) {
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function organizationJsonLd(args: {
  url: string;
  name: string;
  description: string;
  email?: string;
}) {
  const node: Record<string, unknown> = {
    "@context": CTX,
    "@type": "Organization",
    name: args.name,
    url: args.url,
    description: args.description,
  };
  if (args.email) node.email = args.email;
  return node;
}

export function webSiteJsonLd(args: { url: string; name: string; description: string }) {
  return {
    "@context": CTX,
    "@type": "WebSite",
    name: args.name,
    url: args.url,
    description: args.description,
    publisher: {
      "@type": "Organization",
      name: args.name,
      url: args.url,
    },
  };
}

export function breadcrumbListJsonLd(items: { name: string; item: string }[]) {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((el, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: el.name,
      item: el.item,
    })),
  };
}

export function productJsonLd(args: {
  name: string;
  description: string;
  url: string;
  sku?: string;
  imageUrls: string[];
  currency: string;
  lowPrice: number;
  highPrice: number;
  offerCount: number;
  brandName: string;
}) {
  const images = args.imageUrls.filter(Boolean);
  return {
    "@context": CTX,
    "@type": "Product",
    name: args.name,
    description: args.description,
    url: args.url,
    ...(args.sku ? { sku: args.sku } : {}),
    ...(images.length ? { image: images } : {}),
    brand: {
      "@type": "Brand",
      name: args.brandName,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: args.currency,
      lowPrice: String(args.lowPrice),
      highPrice: String(args.highPrice),
      offerCount: args.offerCount,
      availability: "https://schema.org/InStock",
      url: args.url,
    },
  };
}
