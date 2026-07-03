// lib/planner-generator/helpers.ts
// Shared low-level drawing helpers for the Arwign planner PDF engine (pdf-lib).
// All coordinates are in PDF points, origin bottom-left. A4 portrait.

import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib'

export type Color = ReturnType<typeof rgb>

export const PAGE_W = 595.28
export const PAGE_H = 841.89
export const MARGIN = 50
export const CONTENT_W = PAGE_W - MARGIN * 2
/** Lowest y content should reach (leaves room for the footer). */
export const CONTENT_BOTTOM = MARGIN + 14

export interface Fonts {
  serif: PDFFont
  serifBold: PDFFont
  serifItalic: PDFFont
  sans: PDFFont
  sansBold: PDFFont
}

export interface Ctx {
  doc: PDFDocument
  fonts: Fonts
  /** Template accent colour (headings, rules, labels). Used sparingly. */
  accent: Color
  /** Very light tint of the accent (table header fills, shaded cells). */
  accentSoft: Color
  ink: Color
  muted: Color
  line: Color
  cream: Color
}

/** Parse "#RRGGBB" (with or without #) into a pdf-lib colour. Falls back to Arwign gold. */
export function hexToRgb(hex: string | null | undefined): Color {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim())
  const n = m ? parseInt(m[1], 16) : 0xc9a84c
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/** Mix a colour towards white. t = 0 keeps the colour, t = 1 is white. */
export function tint(c: Color, t: number): Color {
  return rgb(c.red + (1 - c.red) * t, c.green + (1 - c.green) * t, c.blue + (1 - c.blue) * t)
}

export function newPage(ctx: Ctx): PDFPage {
  return ctx.doc.addPage([PAGE_W, PAGE_H])
}

/**
 * Standard content-page header: serif title, optional italic subtitle,
 * short accent rule + hairline. Returns the y where content may start.
 */
export function header(ctx: Ctx, page: PDFPage, title: string, subtitle?: string): number {
  let y = PAGE_H - MARGIN - 18
  page.drawText(title, { x: MARGIN, y, size: 20, font: ctx.fonts.serifBold, color: ctx.ink })
  if (subtitle) {
    y -= 16
    page.drawText(subtitle, { x: MARGIN, y, size: 9, font: ctx.fonts.serifItalic, color: ctx.muted })
  }
  y -= 14
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 42, y }, thickness: 2, color: ctx.accent })
  page.drawLine({ start: { x: MARGIN + 48, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.6, color: ctx.line })
  return y - 26
}

/** Small-caps section label (accent by default). */
export function label(ctx: Ctx, page: PDFPage, x: number, y: number, text: string, color?: Color, size = 7.5) {
  page.drawText(text.toUpperCase(), { x, y, size, font: ctx.fonts.sansBold, color: color ?? ctx.accent })
}

/** Horizontal rule. */
export function hline(ctx: Ctx, page: PDFPage, x: number, y: number, width: number, color?: Color, thickness = 0.6) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness, color: color ?? ctx.line })
}

/** Muted label followed by a fill-in line on the same baseline. */
export function labelledLine(ctx: Ctx, page: PDFPage, x: number, y: number, width: number, text: string) {
  label(ctx, page, x, y, text, ctx.muted)
  const lw = ctx.fonts.sansBold.widthOfTextAtSize(text.toUpperCase(), 7.5)
  hline(ctx, page, x + lw + 8, y - 1.5, Math.max(20, width - lw - 8))
}

/** Draw `count` writing lines going down from yTop. Returns the y of the last line. */
export function ruledLines(ctx: Ctx, page: PDFPage, x: number, yTop: number, width: number, count: number, gap = 22): number {
  let y = yTop
  for (let i = 0; i < count; i++) {
    y -= gap
    hline(ctx, page, x, y, width)
  }
  return y
}

export function box(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: Color; border?: Color; borderWidth?: number } = {}
) {
  page.drawRectangle({
    x, y, width: w, height: h,
    color: opts.fill,
    borderColor: opts.border ?? ctx.line,
    borderWidth: opts.borderWidth ?? 0.8,
  })
}

/** Small empty square checkbox anchored at its bottom-left corner. */
export function checkbox(ctx: Ctx, page: PDFPage, x: number, y: number, size = 8) {
  page.drawRectangle({ x, y, width: size, height: size, borderColor: ctx.ink, borderWidth: 0.8 })
}

/** Checkbox followed by a writing line. y is the text baseline. */
export function checkboxLine(ctx: Ctx, page: PDFPage, x: number, y: number, width: number) {
  checkbox(ctx, page, x, y - 1, 8)
  hline(ctx, page, x + 14, y - 1, width - 14)
}

export function circleShape(
  ctx: Ctx,
  page: PDFPage,
  x: number,
  y: number,
  r: number,
  opts: { border?: Color; fill?: Color; borderWidth?: number } = {}
) {
  page.drawCircle({
    x, y, size: r,
    borderColor: opts.border ?? ctx.line,
    borderWidth: opts.borderWidth ?? 0.8,
    color: opts.fill,
  })
}

/** Row of numbered rating circles (1..count). y is the circle centre. */
export function ratingRow(ctx: Ctx, page: PDFPage, x: number, y: number, count: number, gap = 27, r = 9) {
  for (let i = 0; i < count; i++) {
    const cx = x + r + i * gap
    circleShape(ctx, page, cx, y, r)
    const t = String(i + 1)
    const tw = ctx.fonts.sans.widthOfTextAtSize(t, 7.5)
    page.drawText(t, { x: cx - tw / 2, y: y - 2.6, size: 7.5, font: ctx.fonts.sans, color: ctx.muted })
  }
}

export interface TableOpts {
  x?: number
  yTop: number
  colWidths: number[]
  rowHeight: number
  rows: number
  headers?: string[]
  headerHeight?: number
}

/**
 * Ruled table grid with an optional shaded header row.
 * Returns the y of the bottom border.
 */
export function table(ctx: Ctx, page: PDFPage, o: TableOpts): number {
  const x = o.x ?? MARGIN
  const w = o.colWidths.reduce((a, b) => a + b, 0)
  const headerH = o.headers ? (o.headerHeight ?? 18) : 0
  const top = o.yTop
  const bottom = top - headerH - o.rowHeight * o.rows

  if (o.headers) {
    page.drawRectangle({ x, y: top - headerH, width: w, height: headerH, color: ctx.accentSoft })
    let cx = x
    o.headers.forEach((h, i) => {
      page.drawText(h.toUpperCase(), {
        x: cx + 5,
        y: top - headerH + (headerH - 7) / 2,
        size: 7,
        font: ctx.fonts.sansBold,
        color: ctx.ink,
      })
      cx += o.colWidths[i]
    })
  }

  // Horizontal rules (top border, under header, each row, bottom border)
  hline(ctx, page, x, top, w)
  for (let r = 0; r <= o.rows; r++) {
    hline(ctx, page, x, top - headerH - r * o.rowHeight, w)
  }
  // Vertical rules
  let cx = x
  for (let c = 0; c <= o.colWidths.length; c++) {
    page.drawLine({ start: { x: cx, y: top }, end: { x: cx, y: bottom }, thickness: 0.6, color: ctx.line })
    if (c < o.colWidths.length) cx += o.colWidths[c]
  }
  return bottom
}

/** Greedy word wrap for a given font/size/width. */
export function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w
    if (!cur || font.widthOfTextAtSize(candidate, size) <= maxWidth) cur = candidate
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

/** Wrapped paragraph. Returns the y below the last drawn line. */
export function paragraph(
  ctx: Ctx,
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: { size?: number; font?: PDFFont; color?: Color; lineGap?: number } = {}
): number {
  const size = opts.size ?? 9.5
  const font = opts.font ?? ctx.fonts.serif
  const gap = opts.lineGap ?? size * 1.5
  const color = opts.color ?? ctx.ink
  let yy = y
  for (const line of wrap(font, text, size, maxWidth)) {
    page.drawText(line, { x, y: yy, size, font, color })
    yy -= gap
  }
  return yy
}

/** Horizontally centred single line of text. */
export function centered(ctx: Ctx, page: PDFPage, text: string, y: number, size: number, font: PDFFont, color: Color) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color })
}
