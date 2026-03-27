import sanitizeHtml from "sanitize-html"

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "div",
    "hr",
    "pre",
    "code"
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    code: ["class"],
    span: []
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? ""
      const external = /^https?:\/\//i.test(href)
      return {
        tagName: "a",
        attribs: {
          ...attribs,
          target: external ? "_blank" : attribs.target,
          rel: external ? "noopener noreferrer" : attribs.rel
        }
      }
    }
  }
}

/** Safe HTML for product descriptions (Vendure rich text, Editor.js, or plain). */
export function sanitizeProductDescriptionHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim()
}

function escapePlainText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Turn plain text into minimal HTML paragraphs (double newlines = new paragraph). */
function plainTextToHtml(text: string): string {
  const paras = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (paras.length === 0) return ""
  return paras
    .map((p) => `<p>${escapePlainText(p).replace(/\n/g, "<br />")}</p>`)
    .join("")
}

type EditorBlock = {
  type?: string
  data?: {
    text?: string
    level?: number
    items?: unknown[]
    style?: string
    caption?: string
    html?: string
  }
}

/**
 * Editor.js-style JSON → HTML. Inner fragments may contain markup from the editor;
 * full output is passed through {@link sanitizeProductDescriptionHtml}.
 */
function editorJsBlocksToHtml(parsed: { blocks?: EditorBlock[] }): string {
  const blocks = parsed?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return ""

  const parts: string[] = []
  for (const block of blocks) {
    const t = block.type
    const d = block.data ?? {}

    if (t === "paragraph") {
      const text = typeof d.text === "string" ? d.text : ""
      parts.push(text.trim() ? `<p>${text}</p>` : "<p><br /></p>")
      continue
    }

    if (t === "header") {
      const level = Math.min(6, Math.max(2, Number(d.level) || 2))
      const text = typeof d.text === "string" ? d.text : ""
      if (text.trim()) parts.push(`<h${level}>${text}</h${level}>`)
      continue
    }

    if (t === "list") {
      const tag = d.style === "ordered" ? "ol" : "ul"
      const items = Array.isArray(d.items) ? d.items : []
      const lis = items
        .map((item) => {
          if (typeof item === "string") return `<li>${item}</li>`
          if (item && typeof item === "object" && "content" in item) {
            const c = (item as { content?: string }).content
            return typeof c === "string" ? `<li>${c}</li>` : ""
          }
          return ""
        })
        .filter(Boolean)
        .join("")
      if (lis) parts.push(`<${tag}>${lis}</${tag}>`)
      continue
    }

    if (t === "quote") {
      const text = typeof d.text === "string" ? d.text : ""
      const cap = typeof d.caption === "string" ? d.caption : ""
      if (text.trim()) {
        parts.push(
          `<blockquote><p>${text}</p>${cap.trim() ? `<p><em>${cap}</em></p>` : ""}</blockquote>`
        )
      }
      continue
    }

    if (t === "delimiter") {
      parts.push("<hr />")
      continue
    }

    if (t === "raw" && typeof d.html === "string") {
      parts.push(d.html)
    }
  }

  return parts.join("")
}

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s/>]/i.test(s)
}

/**
 * Normalize Vendure / Editor.js / plain description to **sanitized** HTML for
 * `dangerouslySetInnerHTML`. Preserves paragraphs, lists, bold, links, etc.
 */
export function getRenderableProductDescriptionHtml(
  description: string | null | undefined
): string {
  if (description == null) return ""
  const trimmed = description.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { blocks?: EditorBlock[] }
      if (Array.isArray(parsed?.blocks)) {
        const raw = editorJsBlocksToHtml(parsed)
        if (raw) return sanitizeProductDescriptionHtml(raw)
      }
    } catch {
      /* fall through */
    }
  }

  if (looksLikeHtml(trimmed)) {
    return sanitizeProductDescriptionHtml(trimmed)
  }

  return sanitizeProductDescriptionHtml(plainTextToHtml(trimmed))
}

/**
 * Plain text only (metadata, SEO fallbacks). Strips tags / flattens Editor.js.
 */
export function getPlainDescription(description: string | null | undefined): string {
  if (description == null || description === "") return ""

  const trimmed = description.trim()
  if (!trimmed) return ""

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        blocks?: Array<{ data?: { text?: string; content?: string; items?: string[] }; type?: string }>
      }
      const blocks = parsed?.blocks
      if (Array.isArray(blocks)) {
        const parts = blocks
          .map((block) => {
            const d = block?.data
            if (!d) return ""
            if (typeof d.text === "string") return d.text.trim()
            if (typeof d.content === "string") return d.content.trim()
            if (Array.isArray(d.items))
              return d.items.map((i) => (typeof i === "string" ? i.trim() : "")).filter(Boolean).join("\n")
            return ""
          })
          .filter(Boolean)
        return parts.join("\n\n").trim()
      }
    } catch {
      /* fall through */
    }
  }

  return trimmed.replace(/<[^>]*>/g, "").trim()
}
