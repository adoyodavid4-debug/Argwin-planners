import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Shared wrapper for the legal / policy pages (privacy, terms, refund).
// Server component — no interactivity needed.
export default function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated?: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>
      <div className="container-site py-12 md:py-16">
        <nav className="flex items-center gap-1.5 mb-6 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:text-gold transition-colors" style={{ color: 'var(--text-muted)' }}>Home</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)' }}>{title}</span>
        </nav>

        <div className="max-w-3xl">
          <h1 className="font-display mb-3" style={{ fontSize: 'clamp(1.9rem,4vw,2.8rem)', lineHeight: 1.1, color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {updated && (
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Last updated: {updated}</p>
          )}
          {intro && (
            <p className="text-base leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{intro}</p>
          )}

          <div className="mt-8 space-y-9">{children}</div>

          <div className="mt-12 pt-6 border-t text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Questions? Email us at{' '}
            <a href="mailto:support@arwignplanners.com" className="font-semibold" style={{ color: 'var(--gold)' }}>support@arwignplanners.com</a>
            {' '}or visit our{' '}
            <Link href="/contact" className="font-semibold" style={{ color: 'var(--gold)' }}>contact page</Link>.
          </div>
        </div>
      </div>
    </div>
  )
}

// A titled section with prose-styled body. Body text/links inherit the
// secondary colour set on the wrapper; headings and strong stand out.
export function LSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed [&_a]:font-medium [&_strong]:text-[color:var(--text-primary)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </div>
    </section>
  )
}
