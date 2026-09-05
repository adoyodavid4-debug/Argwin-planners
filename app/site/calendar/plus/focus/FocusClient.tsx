'use client'
import { useState } from 'react'
import { ShieldCheck, Moon, Route, Plus } from 'lucide-react'
import PlusShell, { StatCard, SectionCard, Switch } from '../PlusShell'
import { type PlusWorkspace, type FocusRule, type RuleKind } from '@/lib/calendar/plus'

const KIND: Record<RuleKind, { icon: typeof ShieldCheck; label: string }> = {
  focus:    { icon: ShieldCheck, label: 'Focus protection' },
  boundary: { icon: Moon, label: 'Boundaries' },
  buffer:   { icon: Route, label: 'Buffers' },
}

export default function FocusClient({ ws }: { ws: PlusWorkspace }) {
  const [rules, setRules] = useState<FocusRule[]>(ws.focusRules)
  const toggle = (id: string) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, on: !r.on } : r)))

  const on = rules.filter((r) => r.on).length
  const kinds: RuleKind[] = ['focus', 'boundary', 'buffer']

  return (
    <PlusShell workspace={ws} title="Focus & boundaries"
      subtitle="Protect the time that matters — deep work defends itself, evenings stay yours."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New rule</button>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Rules active" value={on} hint={`of ${rules.length}`} />
        <StatCard label="Focus ratio" value={`${ws.analytics.focus_ratio}%`} hint="focus vs meetings" />
        <StatCard label="After-hours" value={`${ws.analytics.after_hours}h`} hint="this week" />
        <StatCard label="Reclaimed" value={`${ws.analytics.reclaimed_hours}h`} hint="by these rules" />
      </div>

      <div className="space-y-6">
        {kinds.map((k) => {
          const list = rules.filter((r) => r.kind === k)
          if (!list.length) return null
          const M = KIND[k]
          return (
            <SectionCard key={k} title={M.label}>
              <div className="space-y-2.5">
                {list.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: r.on ? 'rgba(var(--gold-rgb),0.14)' : 'var(--bg-primary)' }}>
                      <M.icon size={17} style={{ color: r.on ? 'var(--gold)' : 'var(--text-muted)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.detail}</p>
                    </div>
                    <Switch on={r.on} onClick={() => toggle(r.id)} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )
        })}
      </div>
    </PlusShell>
  )
}
