'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  TrendingUp, ShoppingBag, Package, Wand2, FolderTree, FileText, Quote,
  Compass, PenSquare, Settings, BookOpen, Printer, NotebookPen, Lightbulb,
  Magnet, Mail, Users, Filter, Plus, LogOut, Tags,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const adminNav = [
  { label: 'Dashboard',         href: '/admin/dashboard',         icon: TrendingUp },
  { label: 'Orders',            href: '/admin/orders',            icon: ShoppingBag },
  { label: 'Products',          href: '/admin/products',          icon: Package },
  { label: 'Pricing',           href: '/admin/pricing',           icon: Tags },
  { label: 'Planner Generator', href: '/admin/generator',         icon: Wand2 },
  { label: 'Categories',        href: '/admin/categories',        icon: FolderTree },
  { label: 'Blog',              href: '/admin/blog',              icon: FileText },
  { label: 'Testimonials',      href: '/admin/testimonials',      icon: Quote },
  { label: 'Navigation',        href: '/admin/navigation',        icon: Compass },
  { label: 'Content',           href: '/admin/content',           icon: PenSquare },
  { label: 'Settings',          href: '/admin/settings',          icon: Settings },
  { label: 'Fulfillment',       href: '/admin/fulfillment',       icon: BookOpen },
  { label: 'Print Products',    href: '/admin/print-products',    icon: Printer },
  { label: 'Notebooks',         href: '/admin/notebooks',         icon: NotebookPen },
  { label: 'Notebook Requests', href: '/admin/notebook-requests', icon: Lightbulb },
  { label: 'Lead Magnets',      href: '/admin/lead-magnets',      icon: Magnet },
  { label: 'Sequences',         href: '/admin/sequences',         icon: Mail },
  { label: 'Subscribers',       href: '/admin/subscribers',       icon: Users },
  { label: 'Funnel',            href: '/admin/funnel',            icon: Filter },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Signed out')
      router.push('/auth/login')
      router.refresh()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <>
    {/* Mobile / tablet top bar — the sidebar below is desktop-only */}
    <div className="lg:hidden sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image src="/logo.png" alt="Arwign Planners" width={32} height={32} className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>Admin Panel</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-hide" aria-label="Admin navigation">
        {adminNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all"
              style={{
                color:       active ? 'var(--gold)' : 'var(--text-secondary)',
                background:  active ? 'rgba(201,168,76,0.08)' : 'transparent',
                borderColor: active ? 'var(--border-gold)' : 'var(--border)',
              }}
            >
              <item.icon size={13} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>

    <aside
      className="w-64 hidden lg:flex flex-col border-r sticky top-0 h-screen flex-shrink-0"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Arwign Planners"
            width={40}
            height={40}
            className="w-10 h-10 object-contain rounded-lg"
          />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Arwign Planners</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {adminNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                color:      active ? 'var(--gold)' : 'var(--text-secondary)',
                background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
              }}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
        <Link href="/admin/products/new" className="btn-primary w-full justify-center text-xs">
          <Plus size={14} /> Add Product
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
    </>
  )
}
