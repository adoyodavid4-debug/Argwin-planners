// lib/planner-generator/index.ts
// Arwign planner PDF engine. Builds a complete, sellable multi-page A4 planner
// from a planner_templates row using pdf-lib only.

import { PDFDocument, StandardFonts, degrees } from 'pdf-lib'
import {
  Ctx, Fonts, MARGIN, PAGE_W, PAGE_H, CONTENT_W,
  hexToRgb, tint, newPage, header, label, hline, ruledLines, box,
  circleShape, paragraph, wrap, centered,
} from './helpers'
import { CONTENT_BUILDERS, TEMPLATE_FEATURES, TEMPLATE_TIPS } from './templates'

export { TEMPLATE_FEATURES, TEMPLATE_TIPS }

export interface PlannerTemplateInput {
  name: string
  description: string | null
  template_key: string
  accent_hex: string | null
  page_count: number | null
}

export interface GeneratedPlanner {
  bytes: Uint8Array
  pageCount: number
}

/** Build the planner and report the real page count alongside the bytes. */
export async function generatePlannerDetailed(template: PlannerTemplateInput): Promise<GeneratedPlanner> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${template.name} — Arwign`)
  doc.setAuthor('Arwign')
  doc.setCreator('Arwign Planner Generator')
  if (template.description) doc.setSubject(template.description)

  const fonts: Fonts = {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
  }

  const accent = hexToRgb(template.accent_hex)
  const ctx: Ctx = {
    doc,
    fonts,
    accent,
    accentSoft: tint(accent, 0.85),
    ink: hexToRgb('#2C2A35'),
    muted: hexToRgb('#8B8794'),
    line: hexToRgb('#D9D4C8'),
    cream: hexToRgb('#F7F2E8'),
  }

  drawCover(ctx, template)
  drawHowTo(ctx, template)

  const builder = CONTENT_BUILDERS[template.template_key] ?? CONTENT_BUILDERS.daily
  const target = Math.min(80, Math.max(8, template.page_count ?? 30))
  builder(ctx, Math.max(4, target - 3)) // cover + how-to + closing notes = 3

  drawNotes(ctx)
  drawFooters(ctx)

  const bytes = await doc.save()
  return { bytes, pageCount: doc.getPageCount() }
}

/** Public API per the brief: just the PDF bytes. */
export async function generatePlanner(template: PlannerTemplateInput): Promise<Uint8Array> {
  return (await generatePlannerDetailed(template)).bytes
}

/* ────────────────────────────────────────────────────────────────────────────
   Cover page
──────────────────────────────────────────────────────────────────────────── */

function drawCover(ctx: Ctx, template: PlannerTemplateInput) {
  const page = newPage(ctx)
  const { fonts, accent, cream, ink, muted } = ctx

  // Cream field
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream })

  // Accent band at the top with the wordmark
  const bandH = 150
  page.drawRectangle({ x: 0, y: PAGE_H - bandH, width: PAGE_W, height: bandH, color: accent })
  centered(ctx, page, 'A R W I G N', PAGE_H - 78, 17, fonts.sansBold, cream)
  const ruleY = PAGE_H - 96
  page.drawLine({ start: { x: PAGE_W / 2 - 70, y: ruleY }, end: { x: PAGE_W / 2 + 70, y: ruleY }, thickness: 0.8, color: cream })
  centered(ctx, page, 'P L A N N I N G   S T U D I O', PAGE_H - 114, 7.5, fonts.sans, cream)

  // Thin accent band at the very bottom
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 16, color: accent })

  // Hairline frame around the cream field
  box(ctx, page, 40, 44, PAGE_W - 80, PAGE_H - bandH - 44 - 28, { border: accent, borderWidth: 1 })
  box(ctx, page, 46, 50, PAGE_W - 92, PAGE_H - bandH - 56 - 28, { border: accent, borderWidth: 0.4 })

  // Planner name, centred, wrapped
  let nameSize = 34
  let lines = wrap(fonts.serifBold, template.name, nameSize, CONTENT_W - 60)
  if (lines.length > 2) {
    nameSize = 27
    lines = wrap(fonts.serifBold, template.name, nameSize, CONTENT_W - 60)
  }
  let y = 500 + ((lines.length - 1) * nameSize * 1.2) / 2
  for (const line of lines) {
    centered(ctx, page, line, y, nameSize, fonts.serifBold, ink)
    y -= nameSize * 1.2
  }

  // Rule–diamond–rule ornament
  const oy = y - 6
  page.drawLine({ start: { x: PAGE_W / 2 - 90, y: oy }, end: { x: PAGE_W / 2 - 14, y: oy }, thickness: 0.8, color: accent })
  page.drawLine({ start: { x: PAGE_W / 2 + 14, y: oy }, end: { x: PAGE_W / 2 + 90, y: oy }, thickness: 0.8, color: accent })
  page.drawRectangle({ x: PAGE_W / 2, y: oy - 5.66, width: 8, height: 8, rotate: degrees(45), color: accent })

  // Description, italic
  if (template.description) {
    let dy = oy - 34
    const descLines = wrap(fonts.serifItalic, template.description, 11, CONTENT_W - 90).slice(0, 3)
    for (const line of descLines) {
      centered(ctx, page, line, dy, 11, fonts.serifItalic, muted)
      dy -= 17
    }
  }

  // Caption near the bottom of the frame
  centered(ctx, page, 'D I G I T A L   P L A N N E R', 112, 9, fonts.sansBold, accent)
  centered(ctx, page, 'A4  ·  PDF  ·  UNDATED  ·  PRINT & TABLET READY', 94, 7.5, fonts.sans, muted)
}

/* ────────────────────────────────────────────────────────────────────────────
   How-to page
──────────────────────────────────────────────────────────────────────────── */

function drawHowTo(ctx: Ctx, template: PlannerTemplateInput) {
  const page = newPage(ctx)
  const { fonts } = ctx
  let y = header(ctx, page, 'How to Use This Planner', 'A minute of setup, then it stays out of your way.')

  y = paragraph(
    ctx, page,
    `Welcome to your ${template.name}. Every page is undated, so you can start today — not next January — and skip weeks without wasting a single page.`,
    MARGIN, y, CONTENT_W, { size: 10 }
  )
  y -= 14

  const tip = TEMPLATE_TIPS[template.template_key] ?? TEMPLATE_TIPS.daily
  const steps: Array<[string, string]> = [
    ['Print it or import it', 'This A4 PDF works beautifully on paper, or in tablet apps such as GoodNotes, Notability and Xodo — import and write with your stylus.'],
    ['Start anywhere', 'There are no printed dates. Write your own, begin mid-week, pause and come back — the planner will wait.'],
    ['Keep it light', 'A few honest minutes a day beats a perfect system you abandon in week two. Done is better than beautiful.'],
    ['Make it a ritual', tip],
    ['Review and adjust', 'Once a week, glance back. Cross out what is not working, keep what is, and let the planner evolve with you.'],
  ]

  steps.forEach(([title, body], i) => {
    circleShape(ctx, page, MARGIN + 11, y - 4, 11, { fill: ctx.accent, border: ctx.accent })
    const num = String(i + 1)
    const nw = fonts.sansBold.widthOfTextAtSize(num, 10)
    page.drawText(num, { x: MARGIN + 11 - nw / 2, y: y - 7.5, size: 10, font: fonts.sansBold, color: ctx.cream })
    page.drawText(title, { x: MARGIN + 32, y: y - 2, size: 11.5, font: fonts.serifBold, color: ctx.ink })
    const after = paragraph(ctx, page, body, MARGIN + 32, y - 18, CONTENT_W - 32, { size: 9.5, color: ctx.ink })
    y = after - 12
  })

  y -= 6
  label(ctx, page, MARGIN, y, 'Inside this planner')
  y -= 6
  const features = TEMPLATE_FEATURES[template.template_key] ?? TEMPLATE_FEATURES.daily
  for (const f of features) {
    y -= 16
    page.drawText('•', { x: MARGIN + 2, y, size: 9.5, font: fonts.serif, color: ctx.accent })
    page.drawText(f, { x: MARGIN + 14, y, size: 9.5, font: fonts.serif, color: ctx.ink })
  }

  y -= 34
  hline(ctx, page, MARGIN, y, CONTENT_W)
  centered(ctx, page, 'Designed with care by Arwign.', y - 20, 9.5, fonts.serifItalic, ctx.muted)
}

/* ────────────────────────────────────────────────────────────────────────────
   Closing notes page + footers
──────────────────────────────────────────────────────────────────────────── */

function drawNotes(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Notes', 'Loose thoughts, lists, and everything in between.')
  ruledLines(ctx, page, MARGIN, y, CONTENT_W, Math.floor((y - MARGIN - 20) / 26), 26)
}

function drawFooters(ctx: Ctx) {
  const pages = ctx.doc.getPages()
  pages.forEach((page, i) => {
    if (i === 0) return // no footer on the cover
    centered(ctx, page, 'A R W I G N', 28, 6.5, ctx.fonts.sans, ctx.muted)
    const num = String(i + 1)
    const nw = ctx.fonts.sans.widthOfTextAtSize(num, 7)
    page.drawText(num, { x: PAGE_W - MARGIN - nw, y: 28, size: 7, font: ctx.fonts.sans, color: ctx.muted })
  })
}
