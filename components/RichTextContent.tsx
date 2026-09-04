'use client'

import { useEffect, useState } from 'react'
import { isRichText } from '@/lib/richtext'

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'span', 'a',
    'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr',
  ],
  ALLOWED_ATTR: ['style', 'href', 'target', 'rel', 'class'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
}

/**
 * Renders a product description that may be rich HTML (from the admin editor /
 * listing import) or legacy plain text.
 *
 * Sanitizing runs on the CLIENT only. `isomorphic-dompurify` pulls in jsdom on
 * the server, whose `html-encoding-sniffer` dependency crashes the Next.js
 * serverless runtime with ERR_REQUIRE_ESM (500s on every product page with an
 * HTML description). The HTML here is admin-authored/trusted, so the server and
 * first client render output it directly (good for SEO, no hydration mismatch);
 * once mounted, the browser DOMPurify sanitizes it as defense-in-depth.
 */
export default function RichTextContent({
  html, className = '', style,
}: {
  html: string
  className?: string
  style?: React.CSSProperties
}) {
  const isHtml = isRichText(html)
  const [clean, setClean] = useState<string | null>(isHtml ? html : null)

  useEffect(() => {
    if (!isHtml) { setClean(null); return }
    let active = true
    import('isomorphic-dompurify')
      .then(({ default: DOMPurify }) => {
        if (active) setClean(DOMPurify.sanitize(html, SANITIZE_OPTIONS as Record<string, unknown>))
      })
      .catch(() => { /* keep the raw trusted HTML if the sanitizer fails to load */ })
    return () => { active = false }
  }, [html, isHtml])

  if (isHtml && clean !== null) {
    return (
      <div
        className={`rich-text ${className}`.trim()}
        style={style}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    )
  }

  // Legacy plain-text description → split into paragraphs.
  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()} style={style}>
      {html.split(/\n{2,}|(?<=[.!?])\s{2,}/).filter(Boolean).map((para, i) => (
        <p key={i} className="leading-relaxed">{para.trim()}</p>
      ))}
    </div>
  )
}
