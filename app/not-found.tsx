import Link from 'next/link'

export const metadata = { title: 'Page not found — Arwign Planners' }

export default function NotFound() {
  return (
    <main className="container-site flex flex-col items-center justify-center text-center" style={{ minHeight: '70vh', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <p className="font-display" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', lineHeight: 1, color: 'var(--gold)' }}>404</p>
      <h1 className="font-display mt-4 mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', color: 'var(--text-primary)' }}>
        We couldn&rsquo;t find that page
      </h1>
      <p className="mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        The page you&rsquo;re looking for may have moved or no longer exists. Let&rsquo;s get you back to planning.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="btn-primary">Back to home</Link>
        <Link href="/shop" className="btn-outline">Browse the shop</Link>
      </div>
    </main>
  )
}
