import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import TestimonialsClient from './TestimonialsClient'
import type { Testimonial } from '@/types/database'

export const metadata: Metadata = {
  title: 'Testimonials — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminTestimonialsPage() {
  const supabase = createServiceRoleClient()

  const { data: testimonials, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Dashboard
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Testimonials</h1>
          <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
            {testimonials?.length ?? 0}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
            <strong>Migration pending.</strong> Apply <code>013_complete_platform.sql</code> in the Supabase SQL editor to enable testimonials.
          </div>
        ) : (
          <TestimonialsClient initialTestimonials={(testimonials ?? []) as Testimonial[]} />
        )}
      </div>
    </div>
  )
}
