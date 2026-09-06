'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Building2, CreditCard, ShieldCheck, KeyRound, Minus, Plus, AlertTriangle, Check } from 'lucide-react'
import TeamShell, { SectionCard } from '../TeamShell'
import { type TeamWorkspace } from '@/lib/calendar/team'

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London']
const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))

export default function AdminClient({ ws }: { ws: TeamWorkspace }) {
  const [name, setName] = useState(ws.team.name)
  const [timezone, setTimezone] = useState(ws.team.timezone)
  const [billingEmail, setBillingEmail] = useState(ws.team.billing_email)
  const [seats, setSeats] = useState(ws.team.seats_total)

  const save = () => toast.success('Team settings saved')

  return (
    <TeamShell workspace={ws} title="Admin console"
      subtitle="Team profile, roles, provisioning and centralised billing — all in one place."
      actions={<button onClick={save} className="btn-primary px-3.5 py-2 text-sm"><Check size={15} /> Save changes</button>}>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team profile */}
        <SectionCard title="Team profile">
          <div className="space-y-4">
            <Field label="Team name" icon={<Building2 size={15} />}>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </Field>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Default time zone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Billing */}
        <SectionCard title="Billing">
          <div className="mb-4 flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Arwign Teams</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>$49.99 / month · renews {fmtDate(ws.team.renews_on)}</p>
            </div>
            <CreditCard size={20} style={{ color: 'var(--gold)' }} />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Seats</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSeats((s) => Math.max(ws.team.seats_used, s - 1))} className="btn-ghost" aria-label="Fewer seats"><Minus size={15} /></button>
              <span className="min-w-[3rem] text-center font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{seats}</span>
              <button onClick={() => setSeats((s) => s + 1)} className="btn-ghost" aria-label="More seats"><Plus size={15} /></button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ws.team.seats_used} in use · {seats - ws.team.seats_used} available</span>
            </div>
          </div>

          <Field label="Billing email" icon={<CreditCard size={15} />}>
            <input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className="w-full bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
          </Field>
        </SectionCard>

        {/* Security & provisioning */}
        <SectionCard title="Security & provisioning">
          <ul className="space-y-3">
            <Toggle icon={<ShieldCheck size={15} />} title="Require SSO for all members" on />
            <Toggle icon={<KeyRound size={15} />} title="SCIM auto-provisioning" enterprise />
            <Toggle icon={<ShieldCheck size={15} />} title="Two-factor for admins" on />
          </ul>
          <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            SSO / SCIM, audit exports and data-residency are part of <strong style={{ color: 'var(--text-secondary)' }}>Enterprise</strong>. Talk to us to enable them for this team.
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title="Danger zone">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Transfer ownership</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Hand the team to another owner.</p>
              </div>
              <button className="btn-outline px-3 py-1.5 text-xs">Transfer</button>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: 'rgba(180,102,74,0.4)', background: 'rgba(180,102,74,0.05)' }}>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#B4664A' }}><AlertTriangle size={14} /> Delete team</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Permanently remove the team and all shared data.</p>
              </div>
              <button onClick={() => toast.error('Deletion requires confirmation')} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'rgba(180,102,74,0.5)', color: '#B4664A' }}>Delete</button>
            </div>
          </div>
        </SectionCard>
      </div>
    </TeamShell>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        {children}
      </div>
    </div>
  )
}

function Toggle({ icon, title, on = false, enterprise = false }: { icon: React.ReactNode; title: string; on?: boolean; enterprise?: boolean }) {
  const [checked, setChecked] = useState(on)
  return (
    <li className="flex items-center gap-3">
      <span style={{ color: 'var(--gold)' }}>{icon}</span>
      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{title}</span>
      {enterprise && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(var(--gold-rgb),0.14)', color: 'var(--gold-dark)' }}>Enterprise</span>}
      <button onClick={() => setChecked((c) => !c)} disabled={enterprise}
        className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
        style={{ background: checked && !enterprise ? 'var(--gold)' : 'var(--border)' }} aria-pressed={checked}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: checked && !enterprise ? 18 : 2 }} />
      </button>
    </li>
  )
}
