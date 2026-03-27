import { getRenderableProductDescriptionHtml } from "../lib/description"

const proseClass =
  "product-description text-sm text-muted-foreground " +
  "[&_p]:mb-4 [&_p:last-child]:mb-0 [&_p:first-child]:mt-0 " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 " +
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:my-1.5 [&_li]:pl-0.5 " +
  "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic " +
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic " +
  "[&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80 " +
  "[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground " +
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground " +
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground " +
  "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground " +
  "[&_hr]:my-6 [&_hr]:border-border " +
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs"

type Props = {
  description: string | null | undefined
}

/** Renders Vendure rich text / Editor.js / plain text as sanitized HTML. */
export default function ProductRichDescription({ description }: Props) {
  const html = getRenderableProductDescriptionHtml(description)
  if (!html) return null
  return <div className={proseClass} dangerouslySetInnerHTML={{ __html: html }} />
}
