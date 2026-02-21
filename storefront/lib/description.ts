/**
 * Extracts plain text from a product description that may be:
 * - Editor.js JSON (e.g. { "blocks": [{ "data": { "text": "..." } }] })
 * - HTML (we strip tags)
 * - Plain text (returned as-is after trim)
 */
export function getPlainDescription(description: string | null | undefined): string {
  if (description == null || description === "") return ""

  const trimmed = description.trim()
  if (!trimmed) return ""

  // Editor.js format: JSON with blocks[].data.text (or data.content for list items)
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
            if (Array.isArray(d.items)) return d.items.map((i) => (typeof i === "string" ? i.trim() : "")).filter(Boolean).join("\n")
            return ""
          })
          .filter(Boolean)
        return parts.join("\n\n").trim()
      }
    } catch {
      // Not valid JSON, fall through to HTML/plain handling
    }
  }

  // HTML or plain text: strip tags
  return trimmed.replace(/<[^>]*>/g, "").trim()
}
