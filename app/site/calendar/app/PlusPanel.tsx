'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { loadSettings, saveSettings, defaultSettings, type CalendarSettings } from '@/lib/calendar/settings'
import {
  X, Check, Loader2, Sparkles, Phone, Mail, MessageSquare, Moon, Clock,
  BellRing, MapPin, RefreshCcw, CalendarClock, Repeat, FileText, Wand2, LifeBuoy,
  ShieldCheck, Route, Vote, Globe2, Layers, BarChart3, Bell, WifiOff, ArrowRight,
  type LucideIcon,
} from 'lucide-react'

// ── The Arwign Plus capabilities, as toggleable functions ──────────────
type Feature = { key: string; pain: string; fix: string; icon: LucideIcon; href?: string }
type Group = { title: string; blurb: string; items: Feature[] }

const GROUPS: Group[] = [
  {
    title: 'Briefings & reminders',
    blurb: 'Your day reaches you before you open anything.',
    items: [
      { key: 'dailyBriefing', icon: BellRing, href: '/calendar/settings',
        pain: 'The calendar is a passive grid — you must open it to know your day.',
        fix: 'The Daily Outlook Briefing pushes your day to you by email + SMS before you open anything.' },
      { key: 'smartReminders', icon: MapPin, href: '/calendar/settings',
        pain: 'Reminders are dumb — no travel, no prep, no context.',
        fix: 'Smart pre-event push at 30 min with join link, prep note and live “leave now” travel timing.' },
      { key: 'quietDelivery', icon: Bell, href: '/calendar/settings',
        pain: 'Notifications are either noisy or silently missed.',
        fix: 'Respectful, reliable delivery — quiet hours, batching, delivery receipts, no engagement-bait.' },
    ],
  },
  {
    title: 'AI automation',
    blurb: 'Automation proposes; you always accept, edit or dismiss.',
    items: [
      { key: 'reflow', icon: RefreshCcw, href: '/calendar/integrations',
        pain: 'One change cascades and you fix the fallout by hand.',
        fix: 'One-tap AI reflow proposes the least-disruptive shift for every knock-on conflict.' },
      { key: 'timeBlocking', icon: CalendarClock, href: '/calendar/integrations',
        pain: 'Tasks with deadlines never actually get time on the calendar.',
        fix: 'Auto time-blocking slots tasks from your task manager into real, defended slots.' },
      { key: 'floating', icon: Repeat, href: '/calendar/integrations',
        pain: '“Sometime this week” items don’t fit a rigid time grid.',
        fix: 'Flexible, floating items the calendar auto-places and re-places as the week fills.' },
      { key: 'prepBriefs', icon: FileText, href: '/calendar/integrations',
        pain: 'You arrive at meetings cold, with no context.',
        fix: 'AI prep briefs assembled from agenda, attendee/CRM history and last-meeting notes.' },
      { key: 'postMeeting', icon: Wand2, href: '/calendar/integrations',
        pain: 'Meetings end and nothing captures what was decided.',
        fix: 'Post-meeting action extraction turns notes into tasks in your connected tools.' },
      { key: 'rescue', icon: LifeBuoy, href: '/calendar/integrations',
        pain: 'Overbooked weeks with no way out.',
        fix: 'Rescue mode — AI proposes what to decline, move, shorten or delegate.' },
    ],
  },
  {
    title: 'Focus & boundaries',
    blurb: 'Protect the time that actually matters.',
    items: [
      { key: 'focusProtect', icon: ShieldCheck, href: '/calendar/settings',
        pain: 'Deep work gets eaten alive by meetings.',
        fix: 'Focus time that defends itself — protected blocks auto-decline or propose alternates.' },
      { key: 'buffers', icon: Route, href: '/calendar/settings',
        pain: 'Back-to-back days with no breathing room.',
        fix: 'Automatic buffers + travel blocks inserted around your meetings.' },
      { key: 'boundaries', icon: Moon, href: '/calendar/settings',
        pain: 'Evenings and weekends quietly get colonised.',
        fix: 'Boundary rules — “protect my evenings / no-meeting Fridays” enforced automatically.' },
    ],
  },
  {
    title: 'Scheduling, time zones & accounts',
    blurb: 'Find time with anyone, anywhere, without the back-and-forth.',
    items: [
      { key: 'bookingPolls', icon: Vote, href: '/calendar/booking-pages',
        pain: 'Scheduling with others is endless back-and-forth.',
        fix: 'Built-in booking pages + meeting polls — no separate Calendly or Doodle.' },
      { key: 'timezone', icon: Globe2, href: '/calendar/settings',
        pain: 'Time zones cause wrong-time and missed meetings.',
        fix: 'A timezone-correct core, inline “this is 6am for them” warnings and a world-clock strip.' },
      { key: 'unified', icon: Layers, href: '/calendar/integrations',
        pain: 'Double-booking across personal + work accounts.',
        fix: 'A unified, conflict-aware multi-account view that guards against overlaps.' },
    ],
  },
  {
    title: 'Insight & reliability',
    blurb: 'Know where your time goes — and never lose it offline.',
    items: [
      { key: 'analytics', icon: BarChart3, href: '/calendar/analytics',
        pain: 'No idea where your time actually goes.',
        fix: 'Calendar-health analytics — meeting load, focus ratio, after-hours creep, biggest time sinks.' },
      { key: 'offline', icon: WifiOff,
        pain: 'Nothing works properly offline.',
        fix: 'Local-first architecture — full function offline, clean reconciliation on reconnect.' },
    ],
  },
]

const ALL_KEYS = GROUPS.flatMap((g) => g.items.map((i) => i.key))
// Sensible defaults the first time a user opens the panel: everything the core
// app already does is on; provider-dependent AI features start off.
const DEFAULT_ON = new Set(['dailyBriefing', 'smartReminders', 'quietDelivery', 'focusProtect', 'buffers', 'boundaries', 'bookingPolls', 'timezone', 'analytics', 'offline'])

// Basic E.164-ish check: leading +, 8–15 digits.
const phoneValid = (p: string) => /^\+\d{8,15}$/.test(p.replace(/[\s()-]/g, ''))

// Section anchor id + short tab label for the in-panel section tabs.
const gid = (t: string) => 'plus-' + t.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-+$/, '')
const shortLabel = (t: string) => t.split(/[ ,]/)[0]
const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function PlusContent({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [s, setS] = useState<CalendarSettings>(() => defaultSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    ;(async () => {
      const loaded = await loadSettings(supabase)
      if (cancel) return
      // First open: seed feature toggles so nothing looks empty.
      const feats = { ...loaded.features }
      let seeded = false
      for (const k of ALL_KEYS) if (!(k in feats)) { feats[k] = DEFAULT_ON.has(k); seeded = true }
      setS({ ...loaded, features: feats, phone: loaded.phone ?? '' })
      if (seeded) void 0
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [supabase])

  const patch = (p: Partial<CalendarSettings>) => setS((prev) => ({ ...prev, ...p }))
  const toggleFeature = (key: string) => setS((prev) => {
    const next = { ...prev.features, [key]: !prev.features[key] }
    // Keep the real DB column in sync for the one that has direct effect today.
    const extra: Partial<CalendarSettings> = key === 'focusProtect' ? { focus_protect: next[key] } : {}
    return { ...prev, features: next, ...extra }
  })

  const phoneOk = !s.phone || phoneValid(s.phone)
  const canSMS = !!s.phone && phoneValid(s.phone)

  const save = async () => {
    if (s.phone && !phoneValid(s.phone)) { toast.error('Enter a valid phone number, e.g. +254712345678'); return }
    setSaving(true)
    try {
      await saveSettings(supabase, {
        phone: s.phone ? s.phone.replace(/[\s()-]/g, '') : null,
        features: s.features,
        briefing_email: s.briefing_email,
        briefing_sms: canSMS ? s.briefing_sms : false,
        briefing_hour: s.briefing_hour,
        evening_preview: s.evening_preview,
        quiet_start: s.quiet_start,
        quiet_end: s.quiet_end,
        focus_protect: !!s.features.focusProtect,
      })
      toast.success('Arwign Plus preferences saved')
      onClose?.()
    } catch {
      toast.error('Could not save — please try again.')
    } finally { setSaving(false) }
  }

  const activeCount = ALL_KEYS.filter((k) => s.features[k]).length

  return (
    <div className="flex min-h-full flex-col">
            {/* Header + section tabs */}
            <div className="sticky top-0 z-10 border-b" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'rgba(var(--gold-rgb),0.12)', borderColor: 'rgba(var(--gold-rgb),0.35)', color: 'var(--gold-dark)', letterSpacing: '0.08em' }}>
                  <Sparkles size={13} /> Arwign Plus
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeCount}/{ALL_KEYS.length} on</span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={save} disabled={saving || loading} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Save</>}
                  </button>
                  {onClose && <button onClick={onClose} className="btn-ghost" aria-label="Close"><X size={18} /></button>}
                </div>
              </div>
              {!loading && (
                <div className="flex gap-1 overflow-x-auto px-3 pb-2">
                  <TabBtn label="SMS" onClick={() => scrollToSection('plus-sms')} />
                  {GROUPS.map((g) => <TabBtn key={g.title} label={shortLabel(g.title)} onClick={() => scrollToSection(gid(g.title))} />)}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="px-4 py-5 space-y-6">
                {!embedded && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Everything a calendar should have done all along — an assistant that manages your time.
                    Turn capabilities on, then add your phone to get the Daily Outlook Briefing by SMS.
                  </p>
                )}

                {/* ── SMS & briefings (the phone capture) ── */}
                <section id="plus-sms" className="scroll-mt-28 rounded-2xl border p-5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'var(--bg-card)' }}>
                  <div className="mb-1 flex items-center gap-2">
                    <MessageSquare size={16} style={{ color: 'var(--gold)' }} />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>SMS calendar review & briefings</h3>
                  </div>
                  <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Add your phone to receive the Daily Outlook Briefing and a compressed evening preview by text.
                  </p>

                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Phone number (with country code)</label>
                  <div className="mb-1 flex items-center gap-2 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: phoneOk ? 'var(--border)' : '#dc2626', background: 'var(--bg-primary)' }}>
                    <Phone size={15} style={{ color: 'var(--text-muted)' }} />
                    <input
                      value={s.phone ?? ''}
                      onChange={(e) => patch({ phone: e.target.value })}
                      placeholder="+254712345678"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                    {canSMS && <Check size={15} style={{ color: 'var(--gold)' }} />}
                  </div>
                  {!phoneOk && <p className="mb-2 text-xs" style={{ color: '#dc2626' }}>Use international format, e.g. +254 712 345 678.</p>}

                  <div className="mt-3 space-y-2.5">
                    <ToggleRow icon={Mail} label="Email me a morning briefing"
                      on={s.briefing_email} onChange={(v) => patch({ briefing_email: v })} />
                    <ToggleRow icon={MessageSquare} label="SMS briefing to my phone"
                      on={canSMS && s.briefing_sms} disabled={!canSMS}
                      hint={!canSMS ? 'add a valid phone above' : undefined}
                      onChange={(v) => patch({ briefing_sms: v })} />
                    <ToggleRow icon={Clock} label="Evening preview of tomorrow"
                      on={s.evening_preview} onChange={(v) => patch({ evening_preview: v })} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Briefing time</label>
                      <select value={s.briefing_hour} onChange={(e) => patch({ briefing_hour: +e.target.value })}
                        className="w-full rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Quiet hours</label>
                      <div className="flex items-center gap-1">
                        <HourSelect value={s.quiet_start} onChange={(v) => patch({ quiet_start: v })} placeholder="from" />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
                        <HourSelect value={s.quiet_end} onChange={(v) => patch({ quiet_end: v })} placeholder="to" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Your briefing is delivered by SMS at your chosen time. Your number is stored only for briefings and reminders — standard message rates may apply.
                  </p>
                </section>

                {/* ── Capability groups ── */}
                {GROUPS.map((g) => (
                  <section key={g.title} id={gid(g.title)} className="scroll-mt-28">
                    <div className="mb-2">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{g.title}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.blurb}</p>
                    </div>
                    <div className="space-y-2.5">
                      {g.items.map((f) => {
                        const on = !!s.features[f.key]
                        return (
                          <div key={f.key} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{ background: on ? 'rgba(var(--gold-rgb),0.14)' : 'var(--bg-primary)' }}>
                                <f.icon size={17} style={{ color: on ? 'var(--gold)' : 'var(--text-muted)' }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs line-through opacity-60" style={{ color: 'var(--text-muted)' }}>{f.pain}</p>
                                <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.fix}</p>
                                {f.href && (
                                  <Link href={f.href} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                                    Configure <ArrowRight size={12} />
                                  </Link>
                                )}
                              </div>
                              <Switch on={on} onClick={() => toggleFeature(f.key)} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}

                <button onClick={save} disabled={saving} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Save Arwign Plus preferences</>}
                </button>
                <div className="h-4" />
              </div>
            )}
    </div>
  )
}

// Slide-over wrapper (used on small screens / from the toolbar button).
export default function PlusPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80]" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} aria-hidden
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 z-[81] h-full w-full max-w-[560px] overflow-y-auto shadow-glass-lg"
            style={{ background: 'var(--bg-primary)' }}
            aria-label="Arwign Plus"
          >
            <PlusContent onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Small UI pieces ────────────────────────────────────────────────────
function TabBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-black/[0.04]"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{label}</button>
  )
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
      style={{ background: on ? 'var(--gold)' : 'var(--border)' }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '2px' }} />
    </button>
  )
}

function ToggleRow({ icon: Icon, label, on, onChange, disabled, hint }: {
  icon: LucideIcon; label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <Icon size={15} style={{ color: 'var(--text-muted)' }} />
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {label}{hint && <span className="ml-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>({hint})</span>}
      </span>
      <div className="ml-auto"><Switch on={on} onClick={() => { if (!disabled) onChange(!on) }} /></div>
    </div>
  )
}

function HourSelect({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : +e.target.value)}
      className="rounded-lg border px-1.5 py-1.5 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <option value="">{placeholder}</option>
      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
    </select>
  )
}
