// lib/planner-generator/cover-image.ts
// Composes a 600x800 product cover PNG for a generated planner using sharp
// (SVG composition — no external fonts or network access required).

import sharp from 'sharp'

const CREAM = '#F7F2E8'
const SERIF = `Georgia, 'Times New Roman', 'Playfair Display', serif`

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Greedy wrap on word boundaries to a max character count per line. */
function wrapWords(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w
    if (!cur || candidate.length <= maxChars) cur = candidate
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

export interface CoverInput {
  name: string
  accentHex: string | null | undefined
}

export async function generateCoverPng({ name, accentHex }: CoverInput): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test((accentHex ?? '').trim()) ? (accentHex as string).trim() : '#C9A84C'

  const lines = wrapWords(name, 14)
  const fontSize = Math.max(...lines.map(l => l.length)) > 11 || lines.length > 2 ? 46 : 54
  const lineHeight = Math.round(fontSize * 1.22)
  const centerY = 400
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2

  const nameText = lines
    .map((l, i) =>
      `<text x="300" y="${startY + i * lineHeight}" text-anchor="middle" font-family="${SERIF}" font-size="${fontSize}" letter-spacing="1" fill="${CREAM}">${escapeXml(l)}</text>`
    )
    .join('\n    ')

  const ornamentY = startY + (lines.length - 1) * lineHeight + Math.round(lineHeight * 0.9)

  const svg = `<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="800" fill="${accent}"/>
    <rect x="26" y="26" width="548" height="748" fill="none" stroke="${CREAM}" stroke-width="2.5"/>
    <rect x="36" y="36" width="528" height="728" fill="none" stroke="${CREAM}" stroke-width="1" opacity="0.55"/>
    <text x="300" y="118" text-anchor="middle" font-family="${SERIF}" font-size="30" letter-spacing="12" fill="${CREAM}">ARWIGN</text>
    <line x1="225" y1="146" x2="375" y2="146" stroke="${CREAM}" stroke-width="1"/>
    <text x="300" y="172" text-anchor="middle" font-family="${SERIF}" font-size="13" letter-spacing="6" fill="${CREAM}" opacity="0.85">PLANNING STUDIO</text>
    ${nameText}
    <line x1="210" y1="${ornamentY}" x2="284" y2="${ornamentY}" stroke="${CREAM}" stroke-width="1.2"/>
    <rect x="${300 - 5}" y="${ornamentY - 5}" width="10" height="10" fill="${CREAM}" transform="rotate(45 300 ${ornamentY})"/>
    <line x1="316" y1="${ornamentY}" x2="390" y2="${ornamentY}" stroke="${CREAM}" stroke-width="1.2"/>
    <text x="300" y="688" text-anchor="middle" font-family="${SERIF}" font-size="18" letter-spacing="7" fill="${CREAM}">DIGITAL PLANNER</text>
    <text x="300" y="720" text-anchor="middle" font-family="${SERIF}" font-size="13" letter-spacing="4" fill="${CREAM}" opacity="0.8">A4 · PDF · UNDATED</text>
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
