'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, Loader2, X, Plus } from 'lucide-react'
import { loadSettings, saveSettings, defaultSettings, type CalendarSettings } from '@/lib/calendar/settings'
import { REMINDER_PRESETS } from '@/lib/calendar/reminders'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const inp: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }

export default function SettingsClient() {
  const supabase = useMemo(() => createClient() as any, [])
  const { setTheme } = useTheme()
  const [s, setS] = useState<CalendarSettings>(() => defaultSettings())
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [zone, setZone] = useState('')

  useEffect(() => { (async () => { setS(await loadSettings(supabase)); setLoading(false) })() }, [supabase])

  const set = (patch: Partial<CalendarSettings>) => setS((prev) => ({ ...prev, ...patch }))
  const save = async () => {
    await saveSettings(supabase, s)
    setTheme(s.theme === 'system' ? 'light' : s.theme)
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }

  const toggleNoMeeting = (d: number) => set({ no_meeting_days: s.no_meeting_days.includes(d) ? s.no_meeting_days.filter((x) => x !== d) : [...s.no_meeting_days, d] })
  const addReminderDefault = (m: number) => { if (!s.reminder_defaults.some((r) => r.minutes === m)) set({ reminder_defaults: [...s.reminder_defaults, { minutes: m, channel: 'push' }] }) }

  if (loading) return <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site max-w-2xl py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/calendar/app" className="btn-ghost" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar settings</h1>
          <button onClick={save} className="btn-primary ml-auto px-4 py-2 text-sm">{saved ? <><Check size={15} /> Saved</> : 'Save changes'}</button>
        </div>

        <Section title="General">
          <Row label="Time zone">
            <input value={s.timezone} onChange={(e) => set({ timezone: e.target.value })} className="rounded-lg border px-2 py-1.5 text-sm" style={inp} />
          </Row>
          <Row label="Week starts on">
            <select value={s.week_start} onChange={(e) => set({ week_start: +e.target.value })} className="rounded-lg border px-2 py-1.5 text-sm" style={inp}>
              <option value={1}>Monday</option><option value={0}>Sunday</option><option value={6}>Saturday</option>
            </select>
          </Row>
          <Row label="Default view">
            <select value={s.default_view} onChange={(e) => set({ default_view: e.target.value as CalendarSettings['default_view'] })} className="rounded-lg border px-2 py-1.5 text-sm" style={inp}>
              {['day', 'week', 'month', 'agenda', 'year'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Row>
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <div className="flex gap-1.5">
              {(['light', 'warm', 'dark'] as const).map((t) => (
                <button key={t} onClick={() => { set({ theme: t }); setTheme(t) }} className="rounded-lg border px-3 py-1.5 text-sm capitalize"
                  style={{ background: s.theme === t ? 'var(--gold)' : 'transparent', color: s.theme === t ? '#fff' : 'var(--text-secondary)', borderColor: s.theme === t ? 'var(--gold)' : 'var(--border)' }}>{t}</button>
              ))}
            </div>
          </Row>
          <Row label="Density">
            <div className="flex gap-1.5">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button key={d} onClick={() => set({ density: d })} className="rounded-lg border px-3 py-1.5 text-sm capitalize"
                  style={{ background: s.density === d ? 'var(--gold)' : 'transparent', color: s.density === d ? '#fff' : 'var(--text-secondary)', borderColor: s.density === d ? 'var(--gold)' : 'var(--border)' }}>{d}</button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Working hours & focus">
          <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>Working days (used by booking pages and availability).</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const key = String(i === 0 ? 7 : i) // ISO weekday
              const on = !!s.working_hours[key]?.length
              return (
                <button key={d} onClick={() => set({ working_hours: { ...s.working_hours, [key]: on ? [] : [['09:00', '17:00']] } })}
                  className="rounded-lg border px-3 py-1.5 text-sm" style={{ background: on ? 'var(--gold)' : 'transparent', color: on ? '#fff' : 'var(--text-secondary)', borderColor: on ? 'var(--gold)' : 'var(--border)' }}>{d}</button>
              )
            })}
          </div>
          <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>No-meeting days (protected from booking).</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = s.no_meeting_days.includes(i)
              return <button key={d} onClick={() => toggleNoMeeting(i)} className="rounded-lg border px-3 py-1.5 text-sm" style={{ background: on ? '#B4664A' : 'transparent', color: on ? '#fff' : 'var(--text-secondary)', borderColor: on ? '#B4664A' : 'var(--border)' }}>{d}</button>
            })}
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={s.focus_protect} onChange={(e) => set({ focus_protect: e.target.checked })} className="accent-[#A0830E]" />
            Protect focus time — warn before booking over deep-work blocks
          </label>
        </Section>

        <Section title="Reminders">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {s.reminder_defaults.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {REMINDER_PRESETS.find((p) => p.minutes === r.minutes)?.label ?? `${r.minutes}m`}
                <button onClick={() => set({ reminder_defaults: s.reminder_defaults.filter((_, j) => j !== i) })}><X size={11} /></button>
              </span>
            ))}
          </div>
          <select value="" onChange={(e) => { if (e.target.value) addReminderDefault(+e.target.value) }} className="rounded-lg border px-2 py-1.5 text-sm" style={inp}>
            <option value="">+ Add default reminder…</option>
            {REMINDER_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
          </select>
        </Section>

        <Section title="Daily briefing">
          <label className="mb-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={s.briefing_email} onChange={(e) => set({ briefing_email: e.target.checked })} className="accent-[#A0830E]" />
            Email me a morning briefing of my day
          </label>
          <Row label="Briefing time">
            <select value={s.briefing_hour} onChange={(e) => set({ briefing_hour: +e.target.value })} className="rounded-lg border px-2 py-1.5 text-sm" style={inp}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </Row>
          <label className="mb-2 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={s.evening_preview} onChange={(e) => set({ evening_preview: e.target.checked })} className="accent-[#A0830E]" />
            Evening preview of tomorrow
          </label>
          <label className="flex items-center gap-2 text-sm opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={s.briefing_sms} onChange={(e) => set({ briefing_sms: e.target.checked })} className="accent-[#A0830E]" disabled />
            SMS briefing <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(connect an SMS provider in Integrations to enable)</span>
          </label>
        </Section>

        <Section title="World clock">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {s.world_clocks.map((z) => (
              <span key={z} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {z} <button onClick={() => set({ world_clocks: s.world_clocks.filter((x) => x !== z) })}><X size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Europe/London" className="flex-1 rounded-lg border px-2 py-1.5 text-sm" style={inp} />
            <button onClick={() => { const z = zone.trim(); if (z && !s.world_clocks.includes(z)) { set({ world_clocks: [...s.world_clocks, z] }); setZone('') } }} className="btn-outline px-3 py-1.5 text-sm"><Plus size={14} /> Add</button>
          </div>
        </Section>

        <div className="mb-16 mt-4">
          <Link href="/calendar/integrations" className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Manage integrations (Google, Outlook, AI, SMS) →</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <h2 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}
