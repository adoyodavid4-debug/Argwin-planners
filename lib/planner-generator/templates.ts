// lib/planner-generator/templates.ts
// Per-template-key content builders for the Arwign planner PDF engine.
// Each builder receives the shared drawing context and a page budget and
// appends fully-drawn A4 pages to the document.

import { PDFPage } from 'pdf-lib'
import {
  Ctx, MARGIN, PAGE_W, CONTENT_W, CONTENT_BOTTOM,
  newPage, header, label, hline, labelledLine, ruledLines, box, checkbox,
  checkboxLine, circleShape, ratingRow, table, paragraph, centered,
} from './helpers'

export type ContentBuilder = (ctx: Ctx, pages: number) => void

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

/* ────────────────────────────────────────────────────────────────────────────
   Small shared fragments
──────────────────────────────────────────────────────────────────────────── */

/** "DATE ____" on the left + M T W T F S S day circles on the right. */
function dateRow(ctx: Ctx, page: PDFPage, y: number): number {
  labelledLine(ctx, page, MARGIN, y, 200, 'Date')
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const startX = PAGE_W - MARGIN - 7 * 26 + 9
  letters.forEach((d, i) => {
    const x = startX + i * 26
    circleShape(ctx, page, x, y + 2, 9)
    const w = ctx.fonts.sans.widthOfTextAtSize(d, 8)
    page.drawText(d, { x: x - w / 2, y: y - 1, size: 8, font: ctx.fonts.sans, color: ctx.muted })
  })
  return y - 32
}

/** A labelled prompt followed by n ruled lines. Returns the y below. */
function promptBlock(ctx: Ctx, page: PDFPage, x: number, y: number, width: number, prompt: string, lines: number, gap = 21): number {
  label(ctx, page, x, y, prompt)
  return ruledLines(ctx, page, x, y - 2, width, lines, gap) - 16
}

/* ────────────────────────────────────────────────────────────────────────────
   DAILY — repeated daily focus page
──────────────────────────────────────────────────────────────────────────── */

function daily(ctx: Ctx, pages: number) {
  for (let i = 0; i < pages; i++) {
    const page = newPage(ctx)
    let y = header(ctx, page, 'Daily Plan', 'One page. One day. Full focus.')
    y = dateRow(ctx, page, y)

    const colL = MARGIN
    const wL = 280
    const colR = MARGIN + 305
    const wR = CONTENT_W - 305

    // Left column — top 3 priorities
    let yl = y
    label(ctx, page, colL, yl, 'Top 3 priorities')
    yl -= 8
    for (let p = 0; p < 3; p++) {
      box(ctx, page, colL, yl - 32, wL, 30)
      page.drawText(String(p + 1), { x: colL + 10, y: yl - 23, size: 12, font: ctx.fonts.serifBold, color: ctx.accent })
      hline(ctx, page, colL + 26, yl - 24, wL - 38)
      yl -= 38
    }

    // Gratitude
    yl -= 12
    label(ctx, page, colL, yl, 'Gratitude')
    yl -= 13
    page.drawText('Today I am grateful for…', { x: colL, y: yl, size: 8.5, font: ctx.fonts.serifItalic, color: ctx.muted })
    yl = ruledLines(ctx, page, colL, yl, wL, 2, 21)

    // To-dos + notes
    yl -= 20
    label(ctx, page, colL, yl, 'To-dos & notes')
    yl -= 2
    for (let r = 0; r < 6; r++) {
      yl -= 22
      checkboxLine(ctx, page, colL, yl, wL)
    }
    const remaining = Math.max(0, Math.floor((yl - CONTENT_BOTTOM - 12) / 21))
    ruledLines(ctx, page, colL, yl, wL, remaining, 21)

    // Right column — hourly schedule 6am–9pm
    let yr = y
    label(ctx, page, colR, yr, 'Schedule')
    yr -= 6
    const hours = ['6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM']
    for (const h of hours) {
      yr -= 27
      page.drawText(h, { x: colR, y: yr + 3, size: 7.5, font: ctx.fonts.sans, color: ctx.muted })
      hline(ctx, page, colR + 34, yr, wR - 34)
    }
    // End-of-day check
    yr -= 30
    label(ctx, page, colR, yr, 'Did today count?', ctx.muted)
    circleShape(ctx, page, colR + 92, yr + 3, 7)
    page.drawText('Y', { x: colR + 89.5, y: yr, size: 7, font: ctx.fonts.sans, color: ctx.muted })
    circleShape(ctx, page, colR + 114, yr + 3, 7)
    page.drawText('N', { x: colR + 111.5, y: yr, size: 7, font: ctx.fonts.sans, color: ctx.muted })
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   WEEKLY — weekly spread + review, alternating
──────────────────────────────────────────────────────────────────────────── */

function weeklySpread(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Plan', `Week ${week} — design the week before it starts.`)
  labelledLine(ctx, page, MARGIN, y, 220, 'Week of')
  y -= 24

  // 8 cells: 7 days + goals
  const gap = 11
  const cellW = (CONTENT_W - gap) / 2
  const cellH = 100
  const cells = [...DAY_NAMES, 'Goals this week']
  cells.forEach((name, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = MARGIN + col * (cellW + gap)
    const top = y - row * (cellH + 9)
    box(ctx, page, x, top - cellH, cellW, cellH)
    const isGoals = i === 7
    label(ctx, page, x + 8, top - 14, name, isGoals ? ctx.accent : undefined)
    hline(ctx, page, x + 8, top - 19, cellW - 16, ctx.line)
    if (isGoals) {
      for (let l = 0; l < 3; l++) checkboxLine(ctx, page, x + 8, top - 40 - l * 24, cellW - 16)
    } else {
      for (let l = 0; l < 3; l++) hline(ctx, page, x + 8, top - 41 - l * 24, cellW - 16)
    }
  })
  y -= 4 * cellH + 3 * 9 + 24

  // Habit row
  label(ctx, page, MARGIN, y, 'Habits this week')
  y -= 6
  const habitCols = [145, ...Array(7).fill((CONTENT_W - 145) / 7)]
  const bottom = table(ctx, page, {
    yTop: y, colWidths: habitCols, rowHeight: 19, rows: 4,
    headers: ['Habit', ...DAY_ABBR], headerHeight: 16,
  })
  void bottom
}

function weeklyReview(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Review', `Week ${week} — ten honest minutes on Sunday.`)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Wins this week', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'What did not go to plan', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'What I learned', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Top priority for next week', 2)
  label(ctx, page, MARGIN, y, 'Rate your week')
  ratingRow(ctx, page, MARGIN, y - 22, 10)
  y -= 52
  label(ctx, page, MARGIN, y, 'One thing to let go of', ctx.muted)
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function weekly(ctx: Ctx, pages: number) {
  let created = 0
  let week = 1
  while (created < pages) {
    weeklySpread(ctx, week)
    created++
    if (created < pages) { weeklyReview(ctx, week); created++ }
    week++
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   BUDGET — 50/30/20 worksheet, savings tracker, monthly sections
──────────────────────────────────────────────────────────────────────────── */

function budgetWorksheet(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, '50 / 30 / 20 Worksheet', 'A simple frame: needs, wants, and future-you.')
  y = paragraph(ctx, page, 'Split your monthly take-home income into three buckets: 50% for needs, 30% for wants, and 20% for savings and debt payoff. Fill in the targets below, then compare them with reality at the end of the month.', MARGIN, y, CONTENT_W, { size: 9.5 })
  y -= 10
  labelledLine(ctx, page, MARGIN, y, 300, 'Monthly take-home income')
  y -= 28

  const gap = 12
  const bw = (CONTENT_W - gap * 2) / 3
  const buckets = [
    { name: 'Needs', pct: '50%' },
    { name: 'Wants', pct: '30%' },
    { name: 'Savings', pct: '20%' },
  ]
  buckets.forEach((b, i) => {
    const x = MARGIN + i * (bw + gap)
    box(ctx, page, x, y - 130, bw, 130)
    page.drawText(b.pct, { x: x + 10, y: y - 30, size: 22, font: ctx.fonts.serifBold, color: ctx.accent })
    label(ctx, page, x + 10, y - 44, b.name, ctx.muted)
    for (let l = 0; l < 3; l++) hline(ctx, page, x + 10, y - 68 - l * 22, bw - 20)
    label(ctx, page, x + 10, y - 122, 'Target $', ctx.muted, 6.5)
    hline(ctx, page, x + 48, y - 123.5, bw - 58)
  })
  y -= 158

  label(ctx, page, MARGIN, y, 'The plan vs. reality')
  y -= 6
  table(ctx, page, {
    yTop: y, colWidths: [165, 110, 110, 110], rowHeight: 26, rows: 9,
    headers: ['Category', 'Planned', 'Actual', 'Difference'],
  })
}

function budgetSavings(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Savings Tracker', 'Watch the balance climb.')
  labelledLine(ctx, page, MARGIN, y, 300, 'Savings goal')
  labelledLine(ctx, page, MARGIN + 320, y, CONTENT_W - 320, 'Target date')
  y -= 22
  labelledLine(ctx, page, MARGIN, y, 300, 'Goal amount')
  y -= 28
  table(ctx, page, {
    yTop: y, colWidths: [90, 195, 105, 105], rowHeight: 26, rows: 19,
    headers: ['Date', 'Deposit description', 'Amount in', 'Balance'],
  })
}

function budgetMonthOverview(ctx: Ctx, month: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, `Month ${month} — Overview`, 'Know your numbers before the month knows you.')

  const gap = 12
  const bw = (CONTENT_W - gap * 2) / 3
  const cells = ['Income', 'Expenses', 'Saved']
  cells.forEach((name, i) => {
    const x = MARGIN + i * (bw + gap)
    box(ctx, page, x, y - 62, bw, 62)
    label(ctx, page, x + 10, y - 16, name)
    page.drawText('$', { x: x + 10, y: y - 44, size: 14, font: ctx.fonts.serifBold, color: ctx.muted })
    hline(ctx, page, x + 24, y - 46, bw - 36)
  })
  y -= 90

  label(ctx, page, MARGIN, y, 'Fixed bills & due dates')
  y -= 6
  const bottom = table(ctx, page, {
    yTop: y, colWidths: [36, 209, 90, 160], rowHeight: 26, rows: 12,
    headers: ['Paid', 'Bill', 'Due', 'Amount'],
  })
  // Checkboxes down the "Paid" column
  for (let r = 0; r < 12; r++) {
    checkbox(ctx, page, MARGIN + 14, y - 18 - 26 - r * 26 + 9, 9)
  }
  y = bottom - 26
  label(ctx, page, MARGIN, y, 'One money win to aim for this month', ctx.muted)
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function budgetMonthTracker(ctx: Ctx, month: number) {
  const page = newPage(ctx)
  const y = header(ctx, page, `Month ${month} — Expense Tracker`, 'Every dollar gets a line.')
  table(ctx, page, {
    yTop: y, colWidths: [70, 190, 115, 120], rowHeight: 25, rows: 24,
    headers: ['Date', 'Description', 'Category', 'Amount'],
  })
}

function budget(ctx: Ctx, pages: number) {
  budgetWorksheet(ctx)
  budgetSavings(ctx)
  let created = 2
  let month = 1
  while (created < pages) {
    budgetMonthOverview(ctx, month)
    created++
    if (created < pages) { budgetMonthTracker(ctx, month); created++ }
    month++
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   HABIT — definition, milestones, 66-day grids, weekly reflections
──────────────────────────────────────────────────────────────────────────── */

function habitDefine(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Define Your Habits', 'A habit you can name is a habit you can build.')
  for (let h = 0; h < 3; h++) {
    box(ctx, page, MARGIN, y - 176, CONTENT_W, 176)
    page.drawText(String(h + 1), { x: MARGIN + 12, y: y - 26, size: 16, font: ctx.fonts.serifBold, color: ctx.accent })
    let iy = y - 26
    labelledLine(ctx, page, MARGIN + 34, iy, CONTENT_W - 46, 'Habit I am building')
    iy -= 30
    labelledLine(ctx, page, MARGIN + 34, iy, CONTENT_W - 46, 'When / cue')
    iy -= 30
    labelledLine(ctx, page, MARGIN + 34, iy, CONTENT_W - 46, 'Smallest version (2 minutes)')
    iy -= 30
    labelledLine(ctx, page, MARGIN + 34, iy, CONTENT_W - 46, 'Reward')
    iy -= 30
    labelledLine(ctx, page, MARGIN + 34, iy, CONTENT_W - 46, 'Why it matters')
    y -= 196
  }
}

function habitMilestones(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Milestones & Streaks', 'Sixty-six days, five checkpoints.')
  const milestones = [
    { day: 7, note: 'One full week. The hardest part is behind you.' },
    { day: 21, note: 'Three weeks in — the routine is forming.' },
    { day: 33, note: 'Halfway. Momentum is on your side now.' },
    { day: 50, note: 'Fifty days. This is who you are becoming.' },
    { day: 66, note: 'Done. The habit is yours — celebrate properly.' },
  ]
  for (const m of milestones) {
    circleShape(ctx, page, MARGIN + 20, y - 16, 18, { border: ctx.accent, borderWidth: 1.4 })
    const t = String(m.day)
    const tw = ctx.fonts.serifBold.widthOfTextAtSize(t, 13)
    page.drawText(t, { x: MARGIN + 20 - tw / 2, y: y - 20.5, size: 13, font: ctx.fonts.serifBold, color: ctx.accent })
    page.drawText(m.note, { x: MARGIN + 52, y: y - 12, size: 9.5, font: ctx.fonts.serif, color: ctx.ink })
    labelledLine(ctx, page, MARGIN + 52, y - 30, CONTENT_W - 52, 'Reward')
    y -= 62
  }
  y -= 8
  label(ctx, page, MARGIN, y, 'Streak records')
  y -= 10
  const gap = 12
  const bw = (CONTENT_W - gap * 2) / 3
  const cells = ['Current streak', 'Longest streak', 'Restarts (no shame)']
  cells.forEach((name, i) => {
    const x = MARGIN + i * (bw + gap)
    box(ctx, page, x, y - 70, bw, 70)
    label(ctx, page, x + 10, y - 16, name, ctx.muted, 6.5)
    hline(ctx, page, x + 10, y - 52, bw - 20)
  })
  y -= 98
  label(ctx, page, MARGIN, y, 'If I miss a day, my rule is', ctx.muted)
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function habitGrid(ctx: Ctx, habitNo: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, '66-Day Tracker', `Habit ${habitNo} — tick a box every day you show up.`)
  labelledLine(ctx, page, MARGIN, y, 300, 'Habit')
  labelledLine(ctx, page, MARGIN + 320, y, CONTENT_W - 320, 'Start date')
  y -= 30

  const cell = 38
  const cols = 7
  const gridW = cols * cell
  const gx = MARGIN + (CONTENT_W - gridW) / 2
  const milestoneDays = new Set([7, 21, 33, 50, 66])
  for (let d = 0; d < 70; d++) {
    const col = d % cols
    const row = Math.floor(d / cols)
    const x = gx + col * cell
    const top = y - row * cell
    const dayNum = d + 1
    if (dayNum <= 66) {
      const isMilestone = milestoneDays.has(dayNum)
      box(ctx, page, x, top - cell, cell, cell, isMilestone
        ? { fill: ctx.accentSoft, border: ctx.accent, borderWidth: 1 }
        : {})
      page.drawText(String(dayNum), { x: x + 3.5, y: top - 11, size: 6.5, font: ctx.fonts.sans, color: isMilestone ? ctx.accent : ctx.muted })
    } else {
      box(ctx, page, x, top - cell, cell, cell, { fill: ctx.accentSoft, border: ctx.line })
    }
  }
  y -= 10 * cell + 26
  label(ctx, page, MARGIN, y, 'Notes')
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 3, 21)
}

function habitReflection(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Reflection', `Week ${week} — check in with the process, not just the streak.`)
  label(ctx, page, MARGIN, y, 'Days completed this week')
  DAY_ABBR.forEach((d, i) => {
    const x = MARGIN + 160 + i * 42
    checkbox(ctx, page, x, y - 3, 10)
    page.drawText(d, { x: x + 14, y: y - 1, size: 7, font: ctx.fonts.sans, color: ctx.muted })
  })
  y -= 34
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'What made it easy this week', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'What got in the way', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'One adjustment for next week', 2)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'How I feel about my progress', 3)
  label(ctx, page, MARGIN, y, 'Energy this week')
  ratingRow(ctx, page, MARGIN, y - 22, 10)
}

function habit(ctx: Ctx, pages: number) {
  habitDefine(ctx)
  habitMilestones(ctx)
  let created = 2
  let unit = 1
  while (created < pages) {
    habitGrid(ctx, unit)
    created++
    if (created < pages) { habitReflection(ctx, unit); created++ }
    unit++
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   GRATITUDE — daily pages with a weekly reflection every 7th page
──────────────────────────────────────────────────────────────────────────── */

const GRATITUDE_QUOTES = [
  'Gratitude turns what we have into enough.',
  'Small joys, noticed daily, become a good life.',
  'What you appreciate, appreciates.',
  'Attention is the rarest and purest form of generosity.',
  'The days are long, but the years are short — write them down.',
  'Joy is not in things; it is in us.',
]

function gratitudeDaily(ctx: Ctx, index: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Daily Gratitude', 'Three lines a day is enough.')
  y = dateRow(ctx, page, y)

  // Mood row
  label(ctx, page, MARGIN, y, 'Mood')
  for (let i = 0; i < 5; i++) circleShape(ctx, page, MARGIN + 52 + i * 28, y + 3, 9)
  page.drawText('low', { x: MARGIN + 46, y: y - 16, size: 6.5, font: ctx.fonts.sans, color: ctx.muted })
  page.drawText('great', { x: MARGIN + 154, y: y - 16, size: 6.5, font: ctx.fonts.sans, color: ctx.muted })
  y -= 40

  label(ctx, page, MARGIN, y, 'Three things I am grateful for today')
  y -= 4
  for (let n = 0; n < 3; n++) {
    y -= 24
    page.drawText(String(n + 1), { x: MARGIN, y, size: 11, font: ctx.fonts.serifBold, color: ctx.accent })
    hline(ctx, page, MARGIN + 16, y - 1.5, CONTENT_W - 16)
    y -= 22
    hline(ctx, page, MARGIN + 16, y - 1.5, CONTENT_W - 16)
  }
  y -= 26
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'One person who made today better', 1)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'A small moment worth remembering', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Tomorrow I am looking forward to', 2)

  const quote = GRATITUDE_QUOTES[index % GRATITUDE_QUOTES.length]
  centered(ctx, page, `“${quote}”`, Math.max(CONTENT_BOTTOM + 14, y - 14), 9.5, ctx.fonts.serifItalic, ctx.muted)
}

function gratitudeWeekly(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Reflection', `Week ${week} — look back before you look ahead.`)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Highlights of my week', 4)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'I felt most grateful when', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Someone I want to thank', 2)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'One thing I want to notice more next week', 2)
  label(ctx, page, MARGIN, y, 'This week in one word')
  box(ctx, page, MARGIN + 130, y - 12, 180, 28)
}

function gratitude(ctx: Ctx, pages: number) {
  let week = 1
  for (let i = 0; i < pages; i++) {
    if ((i + 1) % 7 === 0) { gratitudeWeekly(ctx, week); week++ }
    else gratitudeDaily(ctx, i)
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   MEAL — weekly grids, grocery lists, pantry inventory, favourite recipes
──────────────────────────────────────────────────────────────────────────── */

function mealWeek(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Meal Plan', `Week ${week} — decide once, eat well all week.`)
  labelledLine(ctx, page, MARGIN, y, 220, 'Week of')
  y -= 22

  const dayCol = 62
  const mealCol = (CONTENT_W - dayCol) / 4
  const rowH = 60
  table(ctx, page, {
    yTop: y, colWidths: [dayCol, mealCol, mealCol, mealCol, mealCol], rowHeight: rowH, rows: 7,
    headers: ['', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'],
  })
  DAY_ABBR.forEach((d, i) => {
    page.drawText(d, { x: MARGIN + 8, y: y - 18 - i * rowH - rowH / 2 + 3, size: 7.5, font: ctx.fonts.sansBold, color: ctx.accent })
  })
  y -= 18 + 7 * rowH + 26
  label(ctx, page, MARGIN, y, 'Prep-ahead notes')
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function mealGrocery(ctx: Ctx) {
  const page = newPage(ctx)
  const yTop = header(ctx, page, 'Grocery List', 'Shop once, with a plan.')
  const gap = 24
  const colW = (CONTENT_W - gap) / 2
  const sections = ['Produce', 'Protein & dairy', 'Pantry', 'Frozen & other']
  sections.forEach((name, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = MARGIN + col * (colW + gap)
    let y = yTop - row * 300
    label(ctx, page, x, y, name)
    y -= 4
    for (let l = 0; l < 10; l++) {
      y -= 25
      checkboxLine(ctx, page, x, y, colW)
    }
  })
}

function mealPantry(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Pantry Inventory', 'Know what you have before you buy more.')
  const bottom = table(ctx, page, {
    yTop: y, colWidths: [215, 80, 60, 140], rowHeight: 26, rows: 22,
    headers: ['Item', 'Quantity', 'Low?', 'Notes'],
  })
  // Checkbox in the "Low?" column
  for (let r = 0; r < 22; r++) {
    checkbox(ctx, page, MARGIN + 215 + 80 + 25, y - 18 - 26 - r * 26 + 9, 9)
  }
  void bottom
}

function mealRecipes(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Favourite Recipes', 'The keepers — written down at last.')
  for (let r = 0; r < 2; r++) {
    box(ctx, page, MARGIN, y - 300, CONTENT_W, 300)
    let iy = y - 24
    labelledLine(ctx, page, MARGIN + 12, iy, CONTENT_W - 24, 'Recipe')
    iy -= 26
    labelledLine(ctx, page, MARGIN + 12, iy, 200, 'Serves')
    labelledLine(ctx, page, MARGIN + 240, iy, CONTENT_W - 252, 'Time')
    iy -= 30
    const half = (CONTENT_W - 24 - 20) / 2
    label(ctx, page, MARGIN + 12, iy, 'Ingredients', ctx.muted)
    label(ctx, page, MARGIN + 12 + half + 20, iy, 'Method', ctx.muted)
    for (let l = 0; l < 8; l++) {
      const ly = iy - 22 - l * 24
      hline(ctx, page, MARGIN + 12, ly, half)
      hline(ctx, page, MARGIN + 12 + half + 20, ly, half)
    }
    y -= 320
  }
}

function meal(ctx: Ctx, pages: number) {
  const extrasCount = pages >= 10 ? 4 : Math.max(0, pages - 6)
  const weekPages = pages - extrasCount
  let created = 0
  let week = 1
  while (created < weekPages) {
    mealWeek(ctx, week)
    created++
    if (created < weekPages) { mealGrocery(ctx); created++ }
    week++
  }
  const extras: Array<() => void> = [
    () => mealPantry(ctx), () => mealPantry(ctx),
    () => mealRecipes(ctx), () => mealRecipes(ctx),
  ]
  extras.slice(0, extrasCount).forEach(fn => fn())
}

/* ────────────────────────────────────────────────────────────────────────────
   FITNESS — split planner, measurements, workout logs, progress reviews
──────────────────────────────────────────────────────────────────────────── */

function fitnessSplit(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Training Split', 'Decide the shape of your week once.')
  const rowH = 88
  DAY_NAMES.forEach((day) => {
    box(ctx, page, MARGIN, y - rowH + 8, CONTENT_W, rowH - 12)
    label(ctx, page, MARGIN + 10, y - 8, day)
    labelledLine(ctx, page, MARGIN + 10, y - 30, 240, 'Focus')
    labelledLine(ctx, page, MARGIN + 280, y - 30, CONTENT_W - 292, 'Time')
    labelledLine(ctx, page, MARGIN + 10, y - 56, CONTENT_W - 22, 'Planned session')
    y -= rowH
  })
}

function fitnessMeasurements(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Measurements Tracker', 'Progress hides in the numbers you write down.')
  table(ctx, page, {
    yTop: y, colWidths: [85, 58, 58, 58, 58, 58, 58, 62], rowHeight: 30, rows: 17,
    headers: ['Date', 'Weight', 'Chest', 'Waist', 'Hips', 'Arms', 'Thighs', 'Notes'],
  })
}

function fitnessLog(ctx: Ctx, session: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Workout Log', `Session ${session}`)
  labelledLine(ctx, page, MARGIN, y, 180, 'Date')
  labelledLine(ctx, page, MARGIN + 200, y, CONTENT_W - 200, 'Focus / body part')
  y -= 26

  const setCol = 62
  table(ctx, page, {
    yTop: y, colWidths: [140, setCol, setCol, setCol, setCol, CONTENT_W - 140 - setCol * 4], rowHeight: 32, rows: 9,
    headers: ['Exercise', 'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Notes'],
  })
  page.drawText('weight × reps per set', { x: MARGIN + 145, y: y + 5, size: 6.5, font: ctx.fonts.serifItalic, color: ctx.muted })
  y -= 18 + 9 * 32 + 26

  labelledLine(ctx, page, MARGIN, y, 240, 'Cardio')
  labelledLine(ctx, page, MARGIN + 260, y, CONTENT_W - 260, 'Duration')
  y -= 30
  label(ctx, page, MARGIN, y, 'Energy today')
  ratingRow(ctx, page, MARGIN + 90, y + 2, 5)
  y -= 30
  label(ctx, page, MARGIN, y, 'Notes', ctx.muted)
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function fitnessReview(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Progress Review', 'Zoom out — what is actually changing?')
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Wins this block', 3)
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'What was hard', 3)
  label(ctx, page, MARGIN, y, 'Strength PRs')
  y -= 6
  y = table(ctx, page, {
    yTop: y, colWidths: [215, 140, 140], rowHeight: 26, rows: 5,
    headers: ['Exercise', 'Previous best', 'New best'],
  })
  y -= 26
  y = promptBlock(ctx, page, MARGIN, y, CONTENT_W, 'Focus for the next block', 2)
  label(ctx, page, MARGIN, y, 'How I feel in my body')
  ratingRow(ctx, page, MARGIN, y - 22, 10)
}

function fitness(ctx: Ctx, pages: number) {
  fitnessSplit(ctx)
  if (pages > 1) fitnessMeasurements(ctx)
  const remaining = Math.max(0, pages - 2)
  const reviews = remaining >= 10 ? 2 : remaining >= 5 ? 1 : 0
  const logs = remaining - reviews
  const midpoint = Math.ceil(logs / 2)
  for (let s = 1; s <= logs; s++) {
    fitnessLog(ctx, s)
    if (reviews === 2 && s === midpoint) fitnessReview(ctx)
  }
  if (reviews >= 1) fitnessReview(ctx)
}

/* ────────────────────────────────────────────────────────────────────────────
   STUDY — exam countdown, assignments, reading list, timetables, pomodoro
──────────────────────────────────────────────────────────────────────────── */

function studyCountdown(ctx: Ctx) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Exam Countdown', 'Deadlines feel smaller when you can see them.')
  const bottom = table(ctx, page, {
    yTop: y, colWidths: [175, 90, 80, 150], rowHeight: 30, rows: 8,
    headers: ['Exam / module', 'Date', 'Days left', 'Confidence (1–5)'],
  })
  // Confidence circles per row
  for (let r = 0; r < 8; r++) {
    const cy = y - 18 - 30 - r * 30 + 15
    for (let c = 0; c < 5; c++) circleShape(ctx, page, MARGIN + 175 + 90 + 80 + 22 + c * 24, cy, 7)
  }
  y = bottom - 30
  label(ctx, page, MARGIN, y, 'Big countdowns')
  y -= 10
  const gap = 12
  const bw = (CONTENT_W - gap * 2) / 3
  for (let i = 0; i < 3; i++) {
    const x = MARGIN + i * (bw + gap)
    box(ctx, page, x, y - 86, bw, 86)
    labelledLine(ctx, page, x + 10, y - 18, bw - 20, 'Exam')
    label(ctx, page, x + 10, y - 74, 'Days to go', ctx.muted, 6.5)
    box(ctx, page, x + bw - 62, y - 80, 50, 34, { border: ctx.accent, borderWidth: 1 })
  }
}

function studyAssignments(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Assignment Tracker', 'Nothing slips when everything is on one page.')
  table(ctx, page, {
    yTop: y, colWidths: [36, 189, 105, 80, 85], rowHeight: 30, rows: 16,
    headers: ['Done', 'Assignment', 'Course', 'Due', 'Grade'],
  })
  for (let r = 0; r < 16; r++) {
    checkbox(ctx, page, MARGIN + 14, y - 18 - 30 - r * 30 + 11, 9)
  }
}

function studyReading(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Reading List', 'Read it, note it, tick it off.')
  table(ctx, page, {
    yTop: y, colWidths: [36, 244, 135, 80], rowHeight: 30, rows: 16,
    headers: ['Read', 'Title / chapter', 'Author / source', 'Pages'],
  })
  for (let r = 0; r < 16; r++) {
    checkbox(ctx, page, MARGIN + 14, y - 18 - 30 - r * 30 + 11, 9)
  }
}

function studyTimetable(ctx: Ctx, week: number) {
  const page = newPage(ctx)
  let y = header(ctx, page, 'Weekly Revision Timetable', `Week ${week} — protect the hours that matter.`)
  labelledLine(ctx, page, MARGIN, y, 220, 'Week of')
  y -= 22
  const timeCol = 58
  const dayW = (CONTENT_W - timeCol) / 7
  const slots = ['8–10', '10–12', '12–2', '2–4', '4–6', '6–8', '8–10']
  table(ctx, page, {
    yTop: y, colWidths: [timeCol, dayW, dayW, dayW, dayW, dayW, dayW, dayW], rowHeight: 58, rows: 7,
    headers: ['', ...DAY_ABBR],
  })
  slots.forEach((s, i) => {
    page.drawText(s, { x: MARGIN + 6, y: y - 18 - i * 58 - 32, size: 7.5, font: ctx.fonts.sansBold, color: ctx.accent })
  })
  y -= 18 + 7 * 58 + 24
  label(ctx, page, MARGIN, y, 'Non-negotiable this week', ctx.muted)
  ruledLines(ctx, page, MARGIN, y - 2, CONTENT_W, 2, 21)
}

function studyPomodoro(ctx: Ctx) {
  const page = newPage(ctx)
  const y = header(ctx, page, 'Pomodoro Session Log', '25 minutes on, 5 minutes off. Tick each round.')
  table(ctx, page, {
    yTop: y, colWidths: [150, 165, 110, 70], rowHeight: 40, rows: 13,
    headers: ['Subject', 'Goal for the session', 'Rounds', 'Done'],
  })
  for (let r = 0; r < 13; r++) {
    const cy = y - 18 - 40 - r * 40 + 16
    for (let c = 0; c < 4; c++) checkbox(ctx, page, MARGIN + 150 + 165 + 10 + c * 24, cy, 10)
    circleShape(ctx, page, MARGIN + 150 + 165 + 110 + 35, cy + 5, 8)
  }
}

function study(ctx: Ctx, pages: number) {
  studyCountdown(ctx)
  if (pages > 1) studyAssignments(ctx)
  if (pages > 2) studyReading(ctx)
  let created = Math.min(pages, 3)
  let week = 1
  while (created < pages) {
    studyTimetable(ctx, week)
    created++
    if (created < pages) { studyPomodoro(ctx); created++ }
    week++
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Registry + marketing copy
──────────────────────────────────────────────────────────────────────────── */

export const CONTENT_BUILDERS: Record<string, ContentBuilder> = {
  daily, weekly, budget, habit, gratitude, meal, fitness, study,
}

/** Marketing feature bullets, reused in the product description and how-to page. */
export const TEMPLATE_FEATURES: Record<string, string[]> = {
  daily: [
    'Undated daily pages with a top-3 priorities panel',
    'Hourly schedule column from 6 AM to 9 PM',
    'Daily gratitude prompt, to-do checklist and notes space',
  ],
  weekly: [
    'Undated weekly spreads with seven labelled day boxes and a goals panel',
    'Built-in weekly habit row across all seven days',
    'Guided Sunday review page for every week',
  ],
  budget: [
    'Monthly overview with income, expenses and savings summaries',
    'Detailed expense tracker tables and a fixed-bills checklist',
    'Savings tracker and a 50/30/20 budgeting worksheet',
  ],
  habit: [
    'Science-based 66-day tracker grids with milestone checkpoints',
    'Habit definition pages built around cue, smallest version and reward',
    'Weekly reflection pages plus streak and milestone records',
  ],
  gratitude: [
    'Daily gratitude pages with three guided prompts and a mood check-in',
    'Weekly reflection pages to capture highlights and thank-yous',
    'A rotating gratitude quote on every daily page',
  ],
  meal: [
    'Weekly meal grids covering breakfast, lunch, dinner and snacks',
    'Categorised grocery lists and a pantry inventory',
    'Favourite-recipes pages so the keepers finally get written down',
  ],
  fitness: [
    'Workout log pages with exercise, sets, reps and weight tables',
    'Weekly training split planner and measurements tracker',
    'Progress review pages with strength PR tables',
  ],
  study: [
    'Exam countdown and confidence tracker',
    'Weekly revision timetables and Pomodoro session logs',
    'Assignment tracker and reading list with tick-off checkboxes',
  ],
}

/** One template-specific tip surfaced on the "How to use" page. */
export const TEMPLATE_TIPS: Record<string, string> = {
  daily: 'Fill in tomorrow’s top 3 priorities the night before — the schedule column is for protecting time, not filling it.',
  weekly: 'Plan the week on Sunday, then spend ten minutes with the review page before the next one starts.',
  budget: 'Start with the 50/30/20 worksheet, then log expenses little and often — two minutes a day beats an hour of catch-up.',
  habit: 'Track one habit per grid. If you miss a day, never miss two — the milestone squares will keep you honest.',
  gratitude: 'Write three lines before bed. On every seventh page, the weekly reflection helps you spot the patterns.',
  meal: 'Plan meals before you write the grocery list, and check the pantry inventory before you shop.',
  fitness: 'Log every session, even the short ones — the measurements tracker only works if the entries keep coming.',
  study: 'Set up the exam countdown first, then block revision hours in the weekly timetable before the week fills itself.',
}
