'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Sparkles, LayoutGrid, BellRing, Brain, ShieldCheck, PlugZap,
  Link2, Wand2, BarChart3, CreditCard, Menu, X, Info, Loader2, BookOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveSettings } from '@/lib/calendar/settings'
import { type PlusWorkspace } from '@/lib/calendar/plus'

const NAV: { href: string; label: string; icon: typeof LayoutGrid; exact?: boolean }[] = [
  { href: '/calendar/plus', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/calendar/plus/briefing', label: 'Daily Briefing', icon: BellRing },
  { href: '/calendar/plus/ai', label: 'AI Scheduling', icon: Brain },
  { href: '/calendar/plus/focus', label: 'Focus & boundaries', icon: ShieldCheck },
  { href: '/calendar/plus/integrations', label: 'Integrations', icon: PlugZap },
  { href: '/calendar/plus/booking', label: 'Booking & polls', icon: Link2 },
  { href: '/calendar/plus/automation', label: 'Automation & rules', icon: Wand2 },
  { href: '/calendar/plus/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/calendar/plus/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/calendar/plus/guide', label: 'How to use & integrate', icon: BookOpen },
]

export default function PlusShell({
  workspace, title, subtitle, actions, children,
}: {
  workspace: PlusWorkspace
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNav, setMobileNav] = useState(false)
  const [busy, setBusy] = useState(false)
  const { profile } = workspace

  const goLive = async () => {
    setBusy(true)
    const supabase = createClient() as any
    try { await saveSettings(supabase, {}); toast.success('Live data enabled'); router.refresh() }
    catch { toast.error('Could not enable — please try again.') }
    finally { setBusy(false) }
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const Sidebar = (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center gap-2">
        <Link href="/calendar/app" className="btn-ghost" aria-label="Back to calendar"><ArrowLeft size={16} /></Link>
        <Sparkles size={18} style={{ color: 'var(--gold)' }} />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>Arwign Plus</p>
          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{profile.email}</p>
        </div>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.06)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--gold-dark)' }}>Plus</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{profile.price}/mo</span>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Individual power user</p>
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
        Need your whole team? <Link href="/calendar/team" className="font-medium" style={{ color: 'var(--gold-dark)' }}>Arwign Teams →</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 self-start overflow-y-auto border-r lg:block" style={{ borderColor: 'var(--border)' }}>
          {Sidebar}
        </aside>

        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
              <div className="flex justify-end p-3"><button onClick={() => setMobileNav(false)} className="btn-ghost"><X size={18} /></button></div>
              {Sidebar}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="container-site py-6">
            {!workspace.live && (
              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm"
                style={{ borderColor: 'rgba(var(--gold-rgb),0.35)', background: 'rgba(var(--gold-rgb),0.08)', color: 'var(--text-secondary)' }}>
                <Info size={16} className="flex-shrink-0" style={{ color: 'var(--gold)' }} />
                <span className="min-w-0 flex-1">
                  <strong style={{ color: 'var(--text-primary)' }}>Preview with sample data.</strong>{' '}
                  Enable live data to persist your briefing, connections and rules to your account.
                </span>
                <button onClick={goLive} disabled={busy} className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-60">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <>Enable live data</>}
                </button>
              </div>
            )}

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

// ── Shared building blocks ────────────────────────────────────
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

export function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} role="switch" aria-checked={on}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
      style={{ background: on ? 'var(--gold)' : 'var(--border)' }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: on ? '22px' : '2px' }} />
    </button>
  )
}
