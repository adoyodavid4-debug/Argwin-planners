'use client'
import { useState, useMemo } from 'react'
import { ShieldCheck, Moon, Route, Plus, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveSettings } from '@/lib/calendar/settings'
import PlusShell, { StatCard, SectionCard, Switch } from '../PlusShell'
import { type PlusWorkspace, type FocusRule, type RuleKind, focusKey, customFocusRulesKey } from '@/lib/calendar/plus'

const KIND: Record<RuleKind, { icon: typeof ShieldCheck; label: string }> = {
  focus:    { icon: ShieldCheck, label: 'Focus protection' },
  boundary: { icon: Moon, label: 'Boundaries' },
  buffer:   { icon: Route, label: 'Buffers' },
}

const blankForm = { label: '', detail: '', kind: 'focus' as RuleKind }

export default function FocusClient({ ws }: { ws: PlusWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [rules, setRules] = useState<FocusRule[]>(ws.focusRules)
  const [features, setFeatures] = useState<Record<string, any>>(ws.featuresRaw)
  const [form, setForm] = useState<typeof blankForm | null>(null)
  const toggle = (id: string) => {
    const on = !(rules.find((r) => r.id === id)?.on)
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, on } : r)))
    if (ws.live) {
      const next = { ...features, [focusKey(id)]: on }
      setFeatures(next)
      saveSettings(supabase, { features: next })
    }
  }
  const saveRule = () => {
    if (!form || !form.label.trim()) return
    const rule: FocusRule = {
      id: `cf-${Date.now().toString(36)}`,
      label: form.label.trim(),
      detail: form.detail.trim() || KIND[form.kind].label,
      kind: form.kind,
      on: true,
    }
    setRules((rs) => [...rs, rule])
    if (ws.live) {
      const customs: FocusRule[] = Array.isArray(features[customFocusRulesKey]) ? features[customFocusRulesKey] : []
      const next: Record<string, any> = { ...features, [customFocusRulesKey]: [...customs, rule] }
      setFeatures(next)
      saveSettings(supabase, { features: next })
    }
    setForm(null)
  }

  const on = rules.filter((r) => r.on).length
  const kinds: RuleKind[] = ['focus', 'boundary', 'buffer']

  return (
    <PlusShell workspace={ws} title="Focus & boundaries"
      subtitle="Protect the time that matters — deep work defends itself, evenings stay yours."
      actions={<button onClick={() => setForm({ ...blankForm })} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New rule</button>}>

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

      {/* New rule dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setForm(null)}>
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>New rule</h2>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name *"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inp} style={inpStyle} placeholder="Deep-work afternoons" /></Field>
              <Field label="Type">
                <div className="flex gap-1.5 flex-wrap">
                  {kinds.map((k) => {
                    const active = form.kind === k
                    const M = KIND[k]
                    return (
                      <button key={k} type="button" onClick={() => setForm({ ...form, kind: k })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                        style={{ borderColor: active ? 'var(--gold)' : 'var(--border)', background: active ? 'rgba(var(--gold-rgb),0.12)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        <M.icon size={13} style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }} /> {M.label}
                      </button>
                    )
                  })}
                </div>
              </Field>
              <Field label="What it protects"><textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={2} className={inp + ' resize-none'} style={inpStyle} placeholder="e.g. 14:00–16:00 daily — meetings auto-declined with alternates offered." /></Field>
              <div className="flex gap-3 pt-2">
                <button onClick={saveRule} disabled={!form.label.trim()} className="btn-primary flex-1 justify-center"><Check size={15} /> Save rule</button>
                <button onClick={() => setForm(null)} className="btn-outline justify-center">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PlusShell>
  )
}

const inp = 'w-full rounded-xl border px-3.5 py-2.5 text-sm'
const inpStyle = { borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' } as const
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}
