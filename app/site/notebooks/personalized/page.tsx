import type { Metadata } from 'next'
import { NotebookRequestForm } from '@/components/notebooks/NotebookRequestForm'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'Personalized Notebooks — Arwign Planners',
  description: 'Custom-made digital notebooks tailored to you. Tell us your idea and we\'ll bring it to life.',
  alternates: { canonical: `${BASE_URL}/notebooks/personalized` },
  openGraph: {
    title: 'Personalized Notebooks — Arwign Planners',
    description: 'Custom-made digital notebooks tailored to you.',
    url: `${BASE_URL}/notebooks/personalized`,
    type: 'website',
  },
}

export default function PersonalizedNotebooksPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Personalized Notebooks</span>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Custom-made, tailored to you.</h1>
        <p className="text-[var(--text-muted)] max-w-xl mx-auto text-lg">
          Not finding the exact layout, theme, or niche you need in our shop? Tell us your idea and our team will design it just for you.
        </p>
      </div>

      {/* How it works */}
      <section className="mb-10 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] p-6">
        <h2 className="text-lg font-semibold mb-3">How it works</h2>
        <ul className="space-y-2 text-sm text-[var(--text-muted)]">
          <li><span className="font-medium text-[var(--text-primary)]">1. Share your idea</span> — describe the layout, theme, or use case you have in mind below</li>
          <li><span className="font-medium text-[var(--text-primary)]">2. We review it</span> — our design team reads every submission and reaches out if it's a fit</li>
          <li><span className="font-medium text-[var(--text-primary)]">3. We bring it to life</span> — get a notebook designed around exactly what you asked for</li>
        </ul>
      </section>

      {/* Idea request form */}
      <NotebookRequestForm locale="en" />
    </main>
  )
}
