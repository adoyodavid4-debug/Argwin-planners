'use client'
import { useState } from 'react'
import { Plus, Users, Repeat, UsersRound, Link2, Copy, Check, Power } from 'lucide-react'
import TeamShell, { SectionCard, Avatar } from '../TeamShell'
import { type TeamWorkspace, type TeamBookingPage, type PageType, byId } from '@/lib/calendar/team'

const TYPE_META: Record<PageType, { icon: typeof Repeat; label: string; blurb: string }> = {
  'round-robin': { icon: Repeat, label: 'Round-robin', blurb: 'Distributes bookings evenly across the team.' },
  collective:    { icon: Users, label: 'Collective', blurb: 'Books only when every host is free.' },
  group:         { icon: UsersRound, label: 'Group', blurb: 'Many invitees, one shared slot.' },
}

export default function BookingClient({ ws }: { ws: TeamWorkspace }) {
  const [pages, setPages] = useState<TeamBookingPage[]>(ws.pages)
  const [copied, setCopied] = useState<string | null>(null)

  const toggle = (id: string) => setPages((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
  const copyLink = (slug: string) => {
    const url = `arwign.com/t/${ws.team.id === 'team-sample' ? 'arwign' : ws.team.id}/${slug}`
    navigator.clipboard?.writeText(`https://${url}`).catch(() => {})
    setCopied(slug); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <TeamShell workspace={ws} currentRole="owner" title="Team booking pages"
      subtitle="Public links that book across the team — no more Calendly or Doodle bolted on the side."
      actions={<button className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> New page</button>}>

      {/* Type legend */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(Object.keys(TYPE_META) as PageType[]).map((t) => {
          const M = TYPE_META[t]
          return (
            <div key={t} className="flex items-start gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                <M.icon size={17} style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{M.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{M.blurb}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pages */}
      <div className="space-y-3">
        {pages.map((p) => {
          const M = TYPE_META[p.type]
          return (
            <div key={p.id} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                  <M.icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{M.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={p.active ? { background: 'rgba(75,122,78,0.15)', color: '#4B7A4E' } : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                      {p.active ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>

                  <button onClick={() => copyLink(p.slug)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    <Link2 size={12} /> arwign.com/t/arwign/{p.slug}
                    {copied === p.slug ? <Check size={12} style={{ color: 'var(--gold)' }} /> : <Copy size={12} />}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{p.duration_min} min</span>
                    <span>·</span>
                    <span>{p.bookings_30d} bookings / 30d</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      Hosts:
                      <span className="flex -space-x-1.5">
                        {p.member_ids.map((id) => {
                          const m = byId(ws.members, id)
                          return m ? <Avatar key={id} name={m.name} hue={m.hue} size={20} /> : null
                        })}
                      </span>
                    </span>
                  </div>
                </div>

                <button onClick={() => toggle(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <Power size={13} /> {p.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </TeamShell>
  )
}
