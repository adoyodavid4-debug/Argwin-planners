'use client'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Building2, CreditCard, ShieldCheck, KeyRound, Minus, Plus, AlertTriangle, Check, X } from 'lucide-react'
import TeamShell, { SectionCard } from '../TeamShell'
import { type TeamWorkspace, byId, logTeamAction } from '@/lib/calendar/team'
import { fmtDateLong } from '@/lib/calendar/fmt'
import { createClient } from '@/lib/supabase/client'

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London']

export default function AdminClient({ ws }: { ws: TeamWorkspace }) {
  const supabase = useMemo(() => createClient() as any, [])
  const [name, setName] = useState(ws.team.name)
  const [timezone, setTimezone] = useState(ws.team.timezone)
  const [billingEmail, setBillingEmail] = useState(ws.team.billing_email)
  const [seats, setSeats] = useState(ws.team.seats_total)

  const candidates = ws.members.filter((m) => m.status === 'active' && m.id !== ws.currentMemberId)
  const [transferTo, setTransferTo] = useState<string | null>(null) // null = closed; member id when open
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteName, setDeleteName] = useState('')

  const save = async () => {
    if (ws.live) {
      // .select() so an RLS-blocked update (no error, zero rows) doesn't report
      // a false success to a non-owner.
      const { data, error } = await supabase.from('teams')
        .update({ name: name.trim() || ws.team.name, timezone, billing_email: billingEmail.trim(), seats_total: seats })
        .eq('id', ws.team.id)
        .select('id')
      if (error) { toast.error(error.message); return }
      if (!data?.length) { toast.error('You don’t have permission to change team settings.'); return }
    }
    toast.success('Team settings saved')
  }

  const doTransfer = async () => {
    const target = byId(ws.members, transferTo ?? '')
    if (!target) { toast.error('Pick a member to hand the team to.'); return }
    if (ws.live) {
      const { data: row, error: uErr } = await supabase.from('team_members').select('user_id').eq('id', target.id).single()
      if (uErr || !row?.user_id) { toast.error('That member hasn’t activated their account yet.'); return }
      // RLS on `teams` may reject handing owner_id to another user. Verify rows
      // actually changed (a blocked update returns no error + zero rows) and
      // abort BEFORE touching roles, so a blocked transfer can't leave the team
      // with a minted second "owner" and no real owner change.
      const { data: owned, error } = await supabase.from('teams').update({ owner_id: row.user_id }).eq('id', ws.team.id).select('id')
      if (error || !owned?.length) { toast.error('Ownership transfer is blocked for security — contact support to complete it.'); return }
      // 'admin' isn't a valid role in 020_teams.sql; Manager ('manage') is the closest demotion.
      const r1 = await supabase.from('team_members').update({ role: 'owner' }).eq('id', target.id).select('id')
      if (r1.error || !r1.data?.length) { toast.error(r1.error?.message ?? 'Could not promote the new owner — contact support.'); return }
      const r2 = await supabase.from('team_members').update({ role: 'manage' }).eq('id', ws.currentMemberId).select('id')
      if (r2.error || !r2.data?.length) toast.error(r2.error?.message ?? 'New owner set, but demoting your role failed — refresh and check.')
      logTeamAction(supabase, ws.team.id, ws.currentMemberId, 'transferred ownership', `${ws.team.name} → ${target.name}`, 'member')
    }
    toast.success(`Ownership transferred to ${target.name}`)
    setTransferTo(null)
  }

  const doDelete = async () => {
    if (deleteName.trim() !== ws.team.name) { toast.error('Type the team name exactly to confirm.'); return }
    if (!ws.live) { toast.success('Sample workspace — nothing was deleted.'); setDeleteOpen(false); setDeleteName(''); return }
    const { data, error } = await supabase.from('teams').delete().eq('id', ws.team.id).select('id')
    if (error) { toast.error(error.message); return }
    if (!data?.length) { toast.error('Only the team owner can delete this team.'); return }
    window.location.href = '/calendar/app'
  }

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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>$49.99 / month{ws.team.renews_on ? ` · renews ${fmtDateLong(ws.team.renews_on, ws.team.timezone)}` : ''}</p>
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
              <button onClick={() => { if (candidates.length === 0) { toast.error('No other active members to transfer to.'); return } setTransferTo(candidates[0].id) }} className="btn-outline px-3 py-1.5 text-xs">Transfer</button>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: 'rgba(180,102,74,0.4)', background: 'rgba(180,102,74,0.05)' }}>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#B4664A' }}><AlertTriangle size={14} /> Delete team</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Permanently remove the team and all shared data.</p>
              </div>
              <button onClick={() => { setDeleteName(''); setDeleteOpen(true) }} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'rgba(180,102,74,0.5)', color: '#B4664A' }}>Delete</button>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Transfer dialog */}
      {transferTo !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setTransferTo(null)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Transfer ownership</h2>
              <button onClick={() => setTransferTo(null)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The new owner gains full control — billing, members and the team itself. You become a Manager.</p>
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>New owner</label>
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  {candidates.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.email}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={doTransfer} className="btn-primary flex-1 justify-center py-2 text-sm"><Check size={15} /> Transfer ownership</button>
                <button onClick={() => setTransferTo(null)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setDeleteOpen(false)}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border p-6 sm:max-w-md sm:rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'rgba(180,102,74,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl" style={{ color: '#B4664A' }}><AlertTriangle size={18} /> Delete this team?</h2>
              <button onClick={() => setDeleteOpen(false)} className="btn-ghost" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This permanently removes <strong style={{ color: 'var(--text-primary)' }}>{ws.team.name}</strong> — members, shared calendars, resources, booking pages and the audit trail. It cannot be undone.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Type <strong style={{ color: 'var(--text-primary)' }}>{ws.team.name}</strong> to confirm</label>
                <input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} placeholder={ws.team.name}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none" style={{ borderColor: 'rgba(180,102,74,0.4)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={doDelete} disabled={deleteName.trim() !== ws.team.name}
                  className="flex-1 justify-center rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: 'rgba(180,102,74,0.5)', color: '#B4664A' }}>Delete team forever</button>
                <button onClick={() => setDeleteOpen(false)} className="btn-outline justify-center py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
