'use client'
import { useState } from 'react'
import { CalendarDays, Check, Loader2 } from 'lucide-react'

interface Option { id: string; start_at: string; end_at: string }
interface Poll {
  id: string; slug: string; title: string; description: string | null; location: string | null
  duration_min: number; timezone: string; status: string; final_start_at: string | null
}

export default function PollVoteClient({ poll, options }: { poll: Poll; options: Option[] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')

  const viewerTZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : poll.timezone
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))

  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const submit = async () => {
    if (!name.trim() || picked.length === 0) { setErr('Please add your name and pick at least one time.'); setState('error'); return }
    setState('loading'); setErr('')
    try {
      const res = await fetch('/api/calendar/polls/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: poll.slug, name, email: email || undefined, optionIds: picked }),
      })
      if (res.ok) setState('done')
      else { const d = await res.json().catch(() => ({})); setErr(d.error ?? 'Something went wrong.'); setState('error') }
    } catch { setErr('Network error.'); setState('error') }
  }

  if (poll.status === 'closed') {
    return (
      <Shell title={poll.title}>
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <Check size={26} className="mx-auto mb-2" style={{ color: '#6E8B7A' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>This poll has closed.</p>
          {poll.final_start_at && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Confirmed time: {fmt(poll.final_start_at)}</p>}
        </div>
      </Shell>
    )
  }
  if (state === 'done') {
    return (
      <Shell title={poll.title}>
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="mb-2 text-4xl">🗳️</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Thanks, {name.split(' ')[0]}!</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Your availability has been recorded.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title={poll.title}>
      {poll.description && <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{poll.description}</p>}
      <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>{poll.duration_min} min · times shown in your zone ({viewerTZ})</p>
      <div className="mb-4 space-y-2">
        {options.map((o) => {
          const on = picked.includes(o.id)
          return (
            <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'rgba(var(--gold-rgb),0.10)' : 'var(--bg-card)' }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-md border" style={{ borderColor: on ? 'var(--gold)' : 'var(--border)', background: on ? 'var(--gold)' : 'transparent' }}>
                {on && <Check size={13} color="#fff" />}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(o.start_at)}</span>
            </button>
          )
        })}
      </div>
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border px-4 py-2.5 text-sm" style={inp} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-xl border px-4 py-2.5 text-sm" style={inp} />
      </div>
      {state === 'error' && <p className="mt-2 text-xs text-red-500">{err}</p>}
      <button onClick={submit} disabled={state === 'loading'} className="btn-primary mt-4 w-full justify-center py-3 disabled:opacity-60">
        {state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Submit availability'}
      </button>
    </Shell>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <CalendarDays size={20} style={{ color: 'var(--gold)' }} />
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {children}
        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Powered by Arwign Calendar</p>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }
