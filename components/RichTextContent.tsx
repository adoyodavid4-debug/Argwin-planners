'use client'

import { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'
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
 * Renders a product description that may be rich HTML (from the admin
 * editor) or legacy plain text. HTML is sanitized before rendering.
 */
export default function RichTextContent({
  html, className = '', style,
}: {
  html: string
  className?: string
  style?: React.CSSProperties
}) {
  const clean = useMemo(
    () => (isRichText(html) ? DOMPurify.sanitize(html, SANITIZE_OPTIONS) : null),
    [html]
  )

  if (clean !== null) {
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
