import Link from 'next/link'

export default function UnsubscribedPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary,#FAF8F4)] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-5xl mb-6">👋</div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">You've been unsubscribed</h1>
      <p className="text-[var(--text-muted)] max-w-sm mb-8">
        You won't receive any more marketing emails from Arwign Planners. If this was a mistake,
        you can re-subscribe from any of our freebie pages.
      </p>
      <Link href="/" className="text-[#C9A84C] hover:underline text-sm">← Back to Arwign Planners</Link>
    </main>
  )
}
