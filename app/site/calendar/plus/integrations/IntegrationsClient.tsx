'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarDays, Video, CheckSquare, Building2, Check, Plug } from 'lucide-react'
import PlusShell, { StatCard, SectionCard } from '../PlusShell'
import { type PlusWorkspace, type Integration, type IntegrationCategory } from '@/lib/calendar/plus'

const CAT: Record<IntegrationCategory, { icon: typeof CalendarDays; label: string }> = {
  calendar:     { icon: CalendarDays, label: 'Calendars' },
  conferencing: { icon: Video, label: 'Conferencing' },
  tasks:        { icon: CheckSquare, label: 'Task managers' },
  crm:          { icon: Building2, label: 'CRM' },
}

export default function IntegrationsClient({ ws }: { ws: PlusWorkspace }) {
  const [items, setItems] = useState<Integration[]>(ws.integrations)
  const toggle = (id: string) => setItems((xs) => xs.map((i) => {
    if (i.id !== id) return i
    const next = i.status === 'connected' ? 'available' : 'connected'
    toast[next === 'connected' ? 'success' : 'error'](`${i.name} ${next === 'connected' ? 'connected' : 'disconnected'}`)
    return { ...i, status: next as Integration['status'] }
  }))

  const connected = items.filter((i) => i.status === 'connected').length
  const cats: IntegrationCategory[] = ['calendar', 'conferencing', 'tasks', 'crm']

  return (
    <PlusShell workspace={ws} title="Integrations"
      subtitle="One unified, conflict-aware view across every account — plus the tools you plan and ship with."
      actions={<span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Plug size={13} style={{ color: 'var(--gold)' }} /> {connected} connected</span>}>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Connected" value={connected} hint={`of ${items.length}`} />
        <StatCard label="Calendars" value={items.filter((i) => i.category === 'calendar' && i.status === 'connected').length} hint="unified view" />
        <StatCard label="Task sources" value={items.filter((i) => i.category === 'tasks' && i.status === 'connected').length} hint="feed time-blocking" />
        <StatCard label="Conferencing" value={items.filter((i) => i.category === 'conferencing' && i.status === 'connected').length} hint="auto-links" />
      </div>

      <div className="space-y-6">
        {cats.map((c) => {
          const list = items.filter((i) => i.category === c)
          const M = CAT[c]
          return (
            <SectionCard key={c} title={M.label}>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((i) => {
                  const conn = i.status === 'connected'
                  return (
                    <div key={i.id} className="flex items-center gap-3 rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-semibold"
                        style={{ background: `hsl(${i.hue} 45% 92%)`, color: `hsl(${i.hue} 45% 34%)` }}>
                        <M.icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{i.name}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{conn && i.account ? i.account : i.note}</p>
                      </div>
                      <button onClick={() => toggle(i.id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={conn
                          ? { borderColor: 'rgba(var(--gold-rgb),0.4)', color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.08)' }
                          : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {conn ? <><Check size={13} /> Connected</> : 'Connect'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )
        })}
      </div>
    </PlusShell>
  )
}
