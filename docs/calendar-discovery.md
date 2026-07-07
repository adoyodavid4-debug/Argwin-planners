# Arwign Calendar — Discovery (Phase 0) & Phase 1 Slice

Per the masterplan §1, discovery precedes feature code. This is the condensed
output for the **Phase 1 — Core Calendar Engine** vertical slice built inside
the existing arwignplanners.com app.

## 1. Repo audit (findings)
- **Stack:** Next.js 14 App Router + TypeScript, Tailwind, Supabase (Postgres +
  Auth + RLS). Matches the masterplan house stack (§4) — no deviation.
- **Auth:** Supabase Auth already wired (`lib/supabase/{client,server}.ts`,
  `middleware.ts`). Calendar reuses it; no new auth system.
- **Conventions:** migrations in `supabase/migrations/NNN_*.sql`, applied via the
  Supabase SQL editor (no CLI/DB password locally). RLS uses `auth.uid()`. A
  shared `set_updated_at()` trigger fn exists (001_schema.sql).
- **Design tokens:** brand tokens in `globals.css` (`--gold` etc.); calendar
  reuses them + the masterplan §8 accents (sage/brass/clay/slate) for colours.

## 2. Platform decision
- **Web-first** inside the existing Next.js app (masterplan §3, Phase 1–5). PWA
  install/offline and native (Expo) are deferred to later phases.

## 3. Sync architecture
- **Deferred to Phase 2.** Phase 1 is a **single-user, Supabase-backed** calendar
  (no external Google/Outlook sync yet). This respects "sync correctness gates
  everything downstream" — we do not build external sync on an unproven base;
  the local model is the canonical store for now.

## 4. Integration credentials required (checklist — NOT provisioned here)
- Google Cloud project + OAuth consent + Calendar API (Phase 2).
- Microsoft Entra app registration + Graph (Phase 2).
- Anthropic Claude API key for NL/AI features (Phase 4). *Not present in env —
  Phase 1 uses a lightweight local quick-add parser, no AI.*

## 5. Phase 1 data model (this slice)
`calendar_events` — see `supabase/migrations/014_calendar_events.sql`. Times are
stored **UTC (`timestamptz`) + IANA `start_tz`**; RLS restricts every row to its
owner (`auth.uid() = user_id`). Recurrence (RRULE), attendees, reminders,
calendars, and sync fields are **deferred** to later migrations.

## 6. Phase 1 slice — what shipped
Auth-gated calendar app at **`/calendar/app`**:
- Month, Week (time grid) and Agenda views; today / prev / next navigation.
- Event **create / edit / delete** (timed + all-day), colour-coding, location, notes.
- Timezone-correct storage & display (UTC in DB, local in UI).
- Quick-add box with a light time parser (e.g. "Standup 9am"); keyboard shortcuts.
- Graceful "setup pending" state until the migration is applied.

**Explicitly deferred (later phases):** external two-way sync, AI/NL &
Daily Briefing, recurrence, drag-create/resize, booking pages, teams/resources,
notifications, PWA/native. Each is a separate scope-locked task.
