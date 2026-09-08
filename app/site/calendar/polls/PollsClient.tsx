'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, X, Copy, Check, Trophy, Loader2, CalendarDays } from 'lucide-react'

interface Option { id: string; start_at: string; end_at: string }
interface Poll {
  id: string; slug: string; title: string; description: string | null; location: string | null
  duration_min: number; timezone: string; status: string; final_start_at: string | null
  options?: Option[]; votes?: { option_id: string; voter_name: string }[]
}

const localTZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'
const slugify = () => Math.random().toString(36).slice(2, 8)
const fmt = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))

export default function PollsClient() {
  const supabase = useMemo(() => createClient() as any, [])
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: pl } = await supabase.from('meeting_polls').select('*').order('created_at', { ascending: false })
    const polls = (pl ?? []) as Poll[]
    if (polls.length) {
      const ids = polls.map((p) => p.id)
      const { data: opts } = await supabase.from('poll_options').select('*').in('poll_id', ids)
      const { data: votes } = await supabase.from('poll_votes').select('poll_id, option_id, voter_name').in('poll_id', ids)
      for (const p of polls) {
        p.options = (opts ?? []).filter((o: any) => o.poll_id === p.id).sort((a: any, b: any) => a.start_at.localeCompare(b.start_at))
        p.votes = (votes ?? []).filter((v: any) => v.poll_id === p.id)
      }
    }
    setPolls(polls); setLoading(false)
  }, [supabase])
  useEffect(() => { load() }, [load])
  // Deep-link support: /calendar/polls?new=1 opens the create dialog directly
  // (used by the "New poll" buttons in the Plus/Teams workspaces).
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') setCreating(true)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/calendar/app" className="btn-ghost" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Meeting polls</h1>
          <button onClick={() => setCreating(true)} className="btn-primary ml-auto px-4 py-2 text-sm"><Plus size={15} /> New poll</button>
        </div>
        <p className="mb-6 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Propose a few times, share the link, and let people vote. Close the poll to auto-book the winning slot on your calendar.
        </p>

        {loading ? (
          <div className="flex justify-center py-20" style={{ color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /></div>
        ) : polls.length === 0 ? (
          <div className="rounded-2xl border py-16 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <CalendarDays size={28} className="mx-auto mb-3" style={{ color: 'var(--gold)' }} />
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>No polls yet.</p>
            <button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><Plus size={15} /> Create a poll</button>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((p) => <PollCard key={p.id} poll={p} supabase={supabase} onChange={load} onCopy={(url) => { navigator.clipboard.writeText(url); setCopied(p.id); setTimeout(() => setCopied(null), 1500) }} copied={copied === p.id} />)}
          </div>
        )}
      </div>
      {creating && <CreatePoll supabase={supabase} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load() }} />}
    </div>
  )
}

function PollCard({ poll, supabase, onChange, onCopy, copied }: {
  poll: Poll; supabase: any; onChange: () => void; onCopy: (url: string) => void; copied: boolean
}) {
  const [busy, setBusy] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/calendar/poll/${poll.slug}` : `/calendar/poll/${poll.slug}`
  const tally = (id: string) => (poll.votes ?? []).filter((v) => v.option_id === id).length
  const winner = (poll.options ?? []).slice().sort((a, b) => tally(b.id) - tally(a.id))[0]

  const close = async () => {
    if (!winner) return
    setBusy(true)
    const end = new Date(new Date(winner.start_at).getTime() + poll.duration_min * 60000)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ev } = await supabase.from('calendar_events').insert({
      user_id: user.id, title: poll.title, description: poll.description,
      location: poll.location, start_at: winner.start_at, end_at: end.toISOString(),
      start_tz: poll.timezone, colour: 'sage',
    }).select('id').single()
    await supabase.from('meeting_polls').update({ status: 'closed', final_start_at: winner.start_at, event_id: ev?.id ?? null }).eq('id', poll.id)
    setBusy(false); onChange()
  }
  const remove = async () => { await supabase.from('meeting_polls').delete().eq('id', poll.id); onChange() }

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{poll.title}</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: poll.status === 'open' ? 'rgba(110,139,122,0.18)' : 'rgba(var(--gold-rgb),0.14)', color: poll.status === 'open' ? '#6E8B7A' : 'var(--gold-dark)' }}>{poll.status}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{poll.duration_min} min · {poll.timezone}</span>
        <div className="ml-auto flex items-center gap-2">
          {poll.status === 'open' && <button onClick={() => onCopy(url)} className="btn-outline px-2.5 py-1.5 text-xs">{copied ? <Check size={13} /> : <Copy size={13} />} Share link</button>}
          {poll.status === 'open' && winner && <button onClick={close} disabled={busy} className="btn-primary px-2.5 py-1.5 text-xs">{busy ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />} Close & book</button>}
          <button onClick={remove} className="btn-ghost text-xs" style={{ color: '#B4664A' }}><X size={14} /></button>
        </div>
      </div>
      <div className="space-y-1.5">
        {(poll.options ?? []).map((o) => {
          const n = tally(o.id)
          const isWin = poll.status === 'closed' && poll.final_start_at === o.start_at
          return (
            <div key={o.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5" style={{ background: isWin ? 'rgba(110,139,122,0.14)' : 'var(--bg-primary)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{fmt(o.start_at, poll.timezone)}</span>
              {isWin && <Trophy size={13} style={{ color: '#6E8B7A' }} />}
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{n} vote{n === 1 ? '' : 's'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreatePoll({ supabase, onClose, onCreated }: { supabase: any; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState(30)
  const [options, setOptions] = useState<string[]>([''])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    const times = options.map((o) => o.trim()).filter(Boolean)
    if (!title.trim() || times.length === 0) { setErr('A title and at least one time option are required.'); return }
    setBusy(true); setErr('')
    const slug = slugify()
    const { data: poll, error } = await supabase.from('meeting_polls').insert({
      slug, title: title.trim(), description: description.trim() || null, location: location.trim() || null,
      duration_min: duration, timezone: localTZ, status: 'open',
    }).select('id').single()
    if (error || !poll) { setErr('Could not create the poll. Have you applied migration 016?'); setBusy(false); return }
    const rows = times.map((t) => {
      const start = new Date(t)
      return { poll_id: poll.id, start_at: start.toISOString(), end_at: new Date(start.getTime() + duration * 60000).toISOString() }
    })
    await supabase.from('poll_options').insert(rows)
    setBusy(false); onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(20,16,10,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New meeting poll</h3>
          <button onClick={onClose} className="btn-ghost"><X size={18} /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Team sync" className="mb-2 w-full rounded-xl border px-3 py-2.5 text-sm" style={inp} />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location / video link (optional)" className="mb-2 w-full rounded-xl border px-3 py-2.5 text-sm" style={inp} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes (optional)" rows={2} className="mb-2 w-full resize-none rounded-xl border px-3 py-2.5 text-sm" style={inp} />
        <label className="mb-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Duration
          <select value={duration} onChange={(e) => setDuration(+e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm" style={inp}>
            {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Proposed times</p>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input type="datetime-local" value={o} onChange={(e) => setOptions((a) => a.map((x, j) => j === i ? e.target.value : x))} className="flex-1 rounded-lg border px-2 py-1.5 text-sm" style={inp} />
              {options.length > 1 && <button onClick={() => setOptions((a) => a.filter((_, j) => j !== i))} className="btn-ghost"><X size={15} /></button>}
            </div>
          ))}
        </div>
        <button onClick={() => setOptions((a) => [...a, ''])} className="mt-2 text-sm font-semibold" style={{ color: 'var(--gold)' }}>+ Add another time</button>
        {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Creating…' : 'Create poll'}</button>
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }
