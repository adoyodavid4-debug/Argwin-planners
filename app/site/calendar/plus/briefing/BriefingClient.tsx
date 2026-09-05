'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail, MessageSquare, Clock, Phone, Check, CalendarDays, Moon } from 'lucide-react'
import PlusShell, { SectionCard, Switch } from '../PlusShell'
import { type PlusWorkspace, type BriefingConfig, phoneValid } from '@/lib/calendar/plus'

export default function BriefingClient({ ws }: { ws: PlusWorkspace }) {
  const [cfg, setCfg] = useState<BriefingConfig>(ws.briefing)
  const [phone, setPhone] = useState(ws.profile.phone)
  const patch = (p: Partial<BriefingConfig>) => setCfg((c) => ({ ...c, ...p }))
  const phoneOk = !phone || phoneValid(phone)
  const canSMS = phoneValid(phone)

  const save = () => {
    if (phone && !phoneValid(phone)) { toast.error('Enter a valid phone, e.g. +254712345678'); return }
    toast.success('Briefing preferences saved')
  }
  const channels = [cfg.email && 'Email', canSMS && cfg.sms && 'SMS', cfg.evening && 'Evening preview'].filter(Boolean)

  return (
    <PlusShell workspace={ws} title="Daily Outlook Briefing"
      subtitle="A proactive summary of your day, delivered before you open anything."
      actions={<button onClick={save} className="btn-primary px-3.5 py-2 text-sm"><Check size={15} /> Save</button>}>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config */}
        <div className="space-y-6">
          <SectionCard title="Channels">
            <div className="space-y-3">
              <Row icon={Mail} label="Email me a morning briefing" on={cfg.email} onChange={(v) => patch({ email: v })} />
              <Row icon={MessageSquare} label="SMS briefing to my phone" on={canSMS && cfg.sms} disabled={!canSMS}
                hint={!canSMS ? 'add a valid phone below' : undefined} onChange={(v) => patch({ sms: v })} />
              <Row icon={Clock} label="Evening preview of tomorrow" on={cfg.evening} onChange={(v) => patch({ evening: v })} />
            </div>
          </SectionCard>

          <SectionCard title="Phone (for SMS)">
            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Number with country code</label>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: phoneOk ? 'var(--border)' : '#dc2626', background: 'var(--bg-primary)' }}>
              <Phone size={15} style={{ color: 'var(--text-muted)' }} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" inputMode="tel"
                className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              {canSMS && <Check size={15} style={{ color: 'var(--gold)' }} />}
            </div>
            {!phoneOk && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>Use international format, e.g. +254 712 345 678.</p>}
            <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>Stored only for briefings and reminders — standard message rates may apply.</p>
          </SectionCard>

          <SectionCard title="Timing">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Briefing time</label>
                <select value={cfg.hour} onChange={(e) => patch({ hour: +e.target.value })}
                  className="w-full rounded-lg border px-2 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}><Moon size={12} /> Quiet hours</label>
                <div className="flex items-center gap-1">
                  <HourSel value={cfg.quiet_start} onChange={(v) => patch({ quiet_start: v })} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
                  <HourSel value={cfg.quiet_end} onChange={(v) => patch({ quiet_end: v })} />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Live preview */}
        <div>
          <SectionCard title="Preview"
            action={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>{channels.length ? channels.join(' · ') : 'no channels on'}</span>}>
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
              <div className="mb-4 flex items-center gap-2 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--gold)' }}><CalendarDays size={16} color="white" /></div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your Monday</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Good morning · {String(cfg.hour).padStart(2, '0')}:00</p>
                </div>
              </div>
              <p className="mb-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                4 meetings, 2h focus protected, 1 conflict to resolve. Leave by 08:40 for your 09:00 in Westlands.
              </p>
              {[
                { time: '09:00', title: 'Client kickoff — Westlands', flag: 'Leave 08:40' },
                { time: '11:30', title: 'Design review', flag: 'Join link' },
                { time: '14:00', title: 'Focus block — protected', flag: null },
                { time: '15:00', title: 'Team sync', flag: '⚠ Clash' },
              ].map((ev) => (
                <div key={ev.time} className="flex items-center gap-3 border-b py-2 last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="w-12 flex-shrink-0 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{ev.time}</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{ev.title}</span>
                  {ev.flag && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>{ev.flag}</span>}
                </div>
              ))}
              {cfg.evening && (
                <p className="mt-4 rounded-lg border border-dashed p-2.5 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Evening preview at {String(cfg.quiet_start ?? 21).padStart(2, '0')}:00 — a compressed look at tomorrow.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </PlusShell>
  )
}

function Row({ icon: Icon, label, on, onChange, disabled, hint }: {
  icon: typeof Mail; label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <Icon size={16} style={{ color: 'var(--text-muted)' }} />
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {label}{hint && <span className="ml-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>({hint})</span>}
      </span>
      <div className="ml-auto"><Switch on={on} disabled={disabled} onClick={() => { if (!disabled) onChange(!on) }} /></div>
    </div>
  )
}

function HourSel({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(+e.target.value)}
      className="rounded-lg border px-1.5 py-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
    </select>
  )
}
