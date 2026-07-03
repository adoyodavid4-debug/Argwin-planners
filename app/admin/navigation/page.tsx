import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import NavigationClient from './NavigationClient'
import type { NavLink } from '@/types/database'

export const metadata: Metadata = {
  title: 'Navigation — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminNavigationPage() {
  const supabase = createServiceRoleClient()

  const { data: links, error } = await supabase
    .from('nav_links')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Dashboard
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Navigation</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
            <strong>Migration pending.</strong> Apply <code>013_complete_platform.sql</code> in the Supabase SQL editor to enable the navigation manager.
          </div>
        ) : (
          <NavigationClient initialLinks={(links ?? []) as NavLink[]} />
        )}
      </div>
    </div>
  )
}
