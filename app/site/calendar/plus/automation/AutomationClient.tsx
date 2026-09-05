'use client'
import { useState } from 'react'
import { Palette, Repeat, Bell, Tag, Plus } from 'lucide-react'
import PlusShell, { StatCard, SectionCard, Switch } from '../PlusShell'
import { type PlusWorkspace, type AutomationRule, type AutomationKind } from '@/lib/calendar/plus'

const KIND: Record<AutomationKind, { icon: typeof Palette; label: string }> = {
  colour:   { icon: Palette, label: 'Auto-colour' },
  template: { icon: Repeat, label: 'Templates' },
  reminder: { icon: Bell, label: 'Reminders' },
  tag:      { icon: Tag, label: 'Tagging' },
}

export default function AutomationClient({ ws }: { ws: PlusWorkspace }) {
  const [rules, setRules] = useState<AutomationRule[]>(ws.automationRules)
  const toggle = (id: string) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, on: !r.on } : r)))
  const on = rules.filter((r) => r.on).length

  return (
    <PlusShell workspace={ws} title="Automation & rules"
      subtitle="Make the calendar work the way you do — colours, templates, reminders and tags on autopilot."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New rule</button>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Rules active" value={on} hint={`of ${rules.length}`} />
        <StatCard label="Colour rules" value={rules.filter((r) => r.kind === 'colour').length} hint="auto-applied" />
        <StatCard label="Templates" value={rules.filter((r) => r.kind === 'template').length} hint="recurring" />
        <StatCard label="Reminder rules" value={rules.filter((r) => r.kind === 'reminder').length} hint="layered" />
      </div>

      <SectionCard title="Rules">
        <div className="space-y-2.5">
          {rules.map((r) => {
            const M = KIND[r.kind]
            return (
              <div key={r.id} className="flex items-start gap-3 rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: r.on ? 'rgba(var(--gold-rgb),0.14)' : 'var(--bg-primary)' }}>
                  <M.icon size={17} style={{ color: r.on ? 'var(--gold)' : 'var(--text-muted)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{M.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.detail}</p>
                </div>
                <Switch on={r.on} onClick={() => toggle(r.id)} />
              </div>
            )
          })}
        </div>
      </SectionCard>
    </PlusShell>
  )
}
