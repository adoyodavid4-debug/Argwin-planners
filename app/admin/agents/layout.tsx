'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, Calendar, Palette, Plug, ScrollText,
  MessageCircle, Users, Link2,
} from 'lucide-react'

const subNav = [
  { label: 'Command Centre',  href: '/admin/agents',               icon: LayoutDashboard },
  { label: 'Approvals',       href: '/admin/agents/approvals',      icon: CheckSquare },
  { label: 'Inbox',           href: '/admin/agents/inbox',          icon: MessageCircle },
  { label: 'Leads',           href: '/admin/agents/leads',          icon: Users },
  { label: 'Entry Points',    href: '/admin/agents/entry-points',   icon: Link2 },
  { label: 'Content Calendar',href: '/admin/agents/calendar',       icon: Calendar },
  { label: 'Brand Kit',       href: '/admin/agents/brand-kit',      icon: Palette },
  { label: 'Integrations',    href: '/admin/agents/integrations',   icon: Plug },
  { label: 'Audit Log',       href: '/admin/agents/audit',          icon: ScrollText },
]

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sub-navigation bar */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide h-12 items-center">
            {subNav.map((item) => {
              const exact  = item.href === '/admin/agents'
              const active = exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={{
                    color:      active ? 'var(--gold)' : 'var(--text-secondary)',
                    background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                  }}
                >
                  <item.icon size={13} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  )
}
