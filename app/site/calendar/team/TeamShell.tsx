'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Users, LayoutGrid, CalendarDays, DoorOpen, Globe2, Link2,
  ShieldCheck, BarChart3, Settings as SettingsIcon, Menu, X, Info, Building2, Loader2, BookOpen, CalendarHeart,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLES, provisionTeam, byId, type TeamWorkspace, type Role } from '@/lib/calendar/team'

const NAV: { href: string; label: string; icon: typeof Users; exact?: boolean }[] = [
  { href: '/calendar/team', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/calendar/team/members', label: 'Members & roles', icon: Users },
  { href: '/calendar/team/calendars', label: 'Shared calendars', icon: CalendarDays },
  { href: '/calendar/team/resources', label: 'Rooms & resources', icon: DoorOpen },
  { href: '/calendar/team/availability', label: 'Availability finder', icon: Globe2 },
  { href: '/calendar/team/booking', label: 'Booking pages', icon: Link2 },
  { href: '/calendar/team/moments', label: 'Moments & Memories', icon: CalendarHeart },
  { href: '/calendar/team/audit', label: 'Delegation & audit', icon: ShieldCheck },
  { href: '/calendar/team/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/calendar/team/settings', label: 'Admin console', icon: SettingsIcon },
  { href: '/calendar/team/guide', label: 'How to use & integrate', icon: BookOpen },
]

export default function TeamShell({
  workspace, currentRole, title, subtitle, actions, children,
}: {
  workspace: TeamWorkspace
  /** Usually omitted — derived from the signed-in member. Pass only to override. */
  currentRole?: Role
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNav, setMobileNav] = useState(false)
  const [busy, setBusy] = useState(false)
  const { team } = workspace
  // The signed-in member's real role drives the footer label and any role UI.
  const role: Role = currentRole ?? byId(workspace.members, workspace.currentMemberId)?.role ?? 'owner'

  const goLive = async () => {
    setBusy(true)
    const supabase = createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    const res = await provisionTeam(supabase, { ownerEmail: user?.email ?? '', timezone: workspace.team.timezone })
    setBusy(false)
    if (res.ok) { toast.success('Your team is ready'); router.refresh() }
    else toast.error(res.error ?? 'Could not create your team')
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const Sidebar = (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center gap-2">
        <Link href="/calendar/app" className="btn-ghost" aria-label="Back to calendar"><ArrowLeft size={16} /></Link>
        <Building2 size={18} style={{ color: 'var(--gold)' }} />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{team.name}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Arwign Teams</p>
        </div>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Seats</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{team.seats_used}/{team.seats_total}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full" style={{ width: `${(team.seats_used / team.seats_total) * 100}%`, background: 'var(--gold)' }} />
        </div>
      </div>

      <nav className="space-y-1 text-sm">
        {NAV.map((n) => {
          const active = isActive(n.href, n.exact)
          return (
            <Link key={n.href} href={n.href} onClick={() => setMobileNav(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
              style={active
                ? { background: 'rgba(var(--gold-rgb),0.12)', color: 'var(--gold-dark)', fontWeight: 600 }
                : { color: 'var(--text-secondary)' }}>
              <n.icon size={16} style={active ? { color: 'var(--gold)' } : undefined} />
              {n.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-xl border p-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        You are <strong style={{ color: 'var(--text-secondary)' }}>{ROLES[role].label}</strong> on this team.
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 self-start overflow-y-auto border-r lg:block" style={{ borderColor: 'var(--border)' }}>
          {Sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
              <div className="flex justify-end p-3"><button onClick={() => setMobileNav(false)} className="btn-ghost"><X size={18} /></button></div>
              {Sidebar}
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="container-site py-6">
            {!workspace.live && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm"
                style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.08)', color: 'var(--text-secondary)' }}>
                <Info size={16} className="flex-shrink-0" style={{ color: 'var(--gold)' }} />
                <span className="min-w-0 flex-1">
                  <strong style={{ color: 'var(--text-primary)' }}>Preview with sample data.</strong>{' '}
                  Create your team to go live — members, roles, resources and approvals then persist to your workspace.
                </span>
                <button onClick={goLive} disabled={busy} className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-60">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <>Create my team</>}
                </button>
              </div>
            )}

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <button onClick={() => setMobileNav(true)} className="btn-ghost lg:hidden" aria-label="Menu"><Menu size={18} /></button>
                <div>
                  <h1 className="font-display font-semibold" style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', color: 'var(--text-primary)' }}>{title}</h1>
                  {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
                </div>
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Small shared building blocks used across sections.
export function RoleBadge({ role }: { role: Role }) {
  const r = ROLES[role]
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
      {r.label}
    </span>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
        <h2 className="font-display text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function Avatar({ name, hue, size = 34 }: { name: string; hue: number; size?: number }) {
  const init = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
  return (
    <span className="inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 45% 34%)` }}>
      {init}
    </span>
  )
}
