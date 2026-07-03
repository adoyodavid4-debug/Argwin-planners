import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ContentClient from './ContentClient'

export const metadata: Metadata = {
  title: 'Site Content — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminContentPage() {
  const supabase = createServiceRoleClient()

  const { data: rows } = await supabase
    .from('site_settings')
    .select('key, value')

  const settings: Record<string, unknown> = {}
  for (const row of rows ?? []) {
    settings[row.key] = row.value
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Dashboard
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Site Content</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <ContentClient settings={settings} />
      </div>
    </div>
  )
}
