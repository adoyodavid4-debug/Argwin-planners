// components/blog/Markdown.tsx
// Tiny dependency-free markdown renderer for blog post bodies.
// Supports: #/##/### headings, paragraphs, - and 1. lists, > blockquotes,
// **bold**, *italic*, `code` and [text](url) links.
// Pure component — safe to use from both server and client components.

import React from 'react'

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string): React.ReactNode {
  const parts = text.split(INLINE_TOKEN).filter((p) => p !== '')
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)' }}>{renderInline(part.slice(2, -2))}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{renderInline(part.slice(1, -1))}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1 py-0.5 rounded text-[0.85em]"
          style={{ background: 'var(--bg-secondary)', fontFamily: 'monospace' }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      return (
        <a key={i} href={link[2]} className="underline hover:no-underline" style={{ color: 'var(--gold)' }}
          target={link[2].startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
          {renderInline(link[1])}
        </a>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

const slugifyHeading = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'paragraph', text: para.join(' ') })
      para = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { flushPara(); continue }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushPara()
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
      continue
    }

    if (trimmed.startsWith('>')) {
      flushPara()
      const last = blocks[blocks.length - 1]
      const text = trimmed.replace(/^>\s?/, '')
      if (last && last.type === 'quote') last.lines.push(text)
      else blocks.push({ type: 'quote', lines: [text] })
      continue
    }

    const ulItem = trimmed.match(/^[-*]\s+(.*)$/)
    if (ulItem) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(ulItem[1])
      else blocks.push({ type: 'ul', items: [ulItem[1]] })
      continue
    }

    const olItem = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (olItem) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ol') last.items.push(olItem[1])
      else blocks.push({ type: 'ol', items: [olItem[1]] })
      continue
    }

    para.push(trimmed)
  }
  flushPara()
  return blocks
}

export default function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            if (block.level <= 2) {
              return (
                <h2 key={i} id={slugifyHeading(block.text)}
                  className="font-display text-2xl md:text-3xl mb-4 mt-10 first:mt-0"
                  style={{ color: 'var(--text-primary)', lineHeight: 1.15, scrollMarginTop: 96 }}>
                  {renderInline(block.text)}
                </h2>
              )
            }
            return (
              <h3 key={i} className="font-semibold text-lg mb-3 mt-8"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}>
                {renderInline(block.text)}
              </h3>
            )
          }
          case 'quote':
            return (
              <blockquote key={i} className="border-l-4 pl-6 my-8 py-2" style={{ borderColor: 'var(--gold)' }}>
                <p className="font-display text-xl italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {renderInline(block.lines.join(' '))}
                </p>
              </blockquote>
            )
          case 'ul':
            return (
              <ul key={i} className="ml-5 mb-5 space-y-2 list-disc list-outside">
                {block.items.map((item, j) => (
                  <li key={j} className="text-[0.96rem] leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="ml-5 mb-5 space-y-2 list-decimal list-outside">
                {block.items.map((item, j) => (
                  <li key={j} className="text-[0.96rem] leading-[1.85]" style={{ color: 'var(--text-secondary)' }}>
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            )
          default:
            return (
              <p key={i} className="text-[0.96rem] leading-[1.85] mb-5" style={{ color: 'var(--text-secondary)' }}>
                {renderInline(block.text)}
              </p>
            )
        }
      })}
    </>
  )
}
