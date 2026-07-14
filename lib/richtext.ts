/**
 * Helpers for product descriptions that may be either legacy plain text
 * or rich HTML produced by the admin editor (Tiptap).
 */

/** True when the string contains HTML markup (rich description). */
export function isRichText(value: string | null | undefined): boolean {
  if (!value) return false
  return /<\/?[a-z][^>]*>/i.test(value)
}

/**
 * Strip tags and decode common entities so rich HTML can be reused as
 * plain text (taglines, meta descriptions, search haystacks, OG images).
 * Regex-based on purpose — it must run on the server without a DOM.
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Plain-text excerpt of a description regardless of its format. */
export function descriptionExcerpt(value: string | null | undefined, maxLength = 160): string {
  const text = stripHtml(value)
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}
