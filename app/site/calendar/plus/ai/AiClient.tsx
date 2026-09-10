'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { BellRing, MessageSquare, Clock, Brain, ShieldCheck, Moon, Check, X, Sparkles, Loader2, ArrowUpRight } from 'lucide-react'
import PlusShell, { StatCard, SectionCard } from '../PlusShell'
import { type PlusWorkspace, type AiSuggestion, type SuggestionType } from '@/lib/calendar/plus'

const META: Record<SuggestionType, { icon: typeof Brain; label: string }> = {
  reschedule:    { icon: BellRing, label: 'Smart reschedule' },
  'email-event': { icon: MessageSquare, label: 'Email → event' },
  'time-block':  { icon: Clock, label: 'Time-blocking' },
  prep:          { icon: Brain, label: 'Prep brief' },
  rescue:        { icon: ShieldCheck, label: 'Rescue mode' },
  boundary:      { icon: Moon, label: 'Boundary rules' },
}

export default function AiClient({ ws }: { ws: PlusWorkspace }) {
  const router = useRouter()
  const [items, setItems] = useState<AiSuggestion[]>(ws.suggestions)
  const [done, setDone] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Actionable suggestions actually mutate the calendar via the apply route,
  // which re-validates against live data. On success we refresh so the list
  // re-derives from the now-changed calendar (resolved items don't reappear).
  const apply = async (s: AiSuggestion) => {
    if (!s.action || busyId) return
    setBusyId(s.id)
    try {
      const res = await fetch('/api/calendar/plus/suggestions/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: s.action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json?.error || 'Could not apply that.'); return }
      setItems((xs) => xs.filter((x) => x.id !== s.id))
      setDone((d) => d + 1)
      toast.success(json?.message || 'Applied to your calendar')
      router.refresh()
    } catch {
      toast.error('Could not reach the server.')
    } finally {
      setBusyId(null)
    }
  }
  const dismiss = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id))

  return (
    <PlusShell workspace={ws} title="AI Scheduling"
      subtitle="Automation proposes; you always accept, edit or dismiss. Nothing changes without you."
      actions={<span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Sparkles size={13} style={{ color: 'var(--gold)' }} /> {items.length} pending</span>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending" value={items.length} hint="suggestions to review" />
        <StatCard label="Applied today" value={done} hint="one tap each" />
        <StatCard label="Reclaimed" value={`${ws.analytics.reclaimed_hours}h`} hint="this week" />
        <StatCard label="Conflicts" value={items.filter((i) => i.type === 'reschedule').length} hint="to resolve" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Suggestions">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-2 text-3xl">✨</div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Inbox zero. Your assistant will surface the next move as it appears.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((s) => {
                  const M = META[s.type]
                  return (
                    <div key={s.id} className="flex flex-wrap items-start gap-3 rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                        <M.icon size={17} style={{ color: 'var(--gold)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                          <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{M.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.detail}</p>
                        {s.when && <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.when}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.action ? (
                          <button onClick={() => apply(s)} disabled={busyId === s.id} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gold)' }}>
                            {busyId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Apply
                          </button>
                        ) : (
                          <a href="/calendar/app" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                            Review <ArrowUpRight size={13} />
                          </a>
                        )}
                        <button onClick={() => dismiss(s.id)} className="btn-ghost" aria-label="Dismiss"><X size={15} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="What the AI does">
          <ul className="space-y-3 text-sm">
            {Object.values(META).map((m) => (
              <li key={m.label} className="flex items-start gap-2.5" style={{ color: 'var(--text-secondary)' }}>
                <m.icon size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} /> {m.label}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Powered by your connected calendars, task managers and email. Manage sources in <strong style={{ color: 'var(--text-secondary)' }}>Integrations</strong>.
          </div>
        </SectionCard>
      </div>
    </PlusShell>
  )
}
