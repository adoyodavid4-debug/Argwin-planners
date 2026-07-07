'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ConfirmedContent() {
  const sp = useSearchParams()
  const downloadUrl = sp.get('download') ? decodeURIComponent(sp.get('download')!) : null
  const resend = sp.get('resend')

  return (
    <main className="min-h-screen bg-[var(--bg-primary,#FAF8F4)] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
        {resend ? 'You\'re already confirmed!' : 'You\'re confirmed!'}
      </h1>
      {downloadUrl ? (
        <>
          <p className="text-[var(--text-muted)] mb-8 max-w-sm">
            Your free download is ready. We also sent it to your email.
          </p>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#A0830E] px-8 py-3 font-semibold text-white hover:bg-[#b8963e] transition-colors mb-6"
          >
            Download now ↓
          </a>
        </>
      ) : (
        <p className="text-[var(--text-muted)] mb-8 max-w-sm">
          Check your inbox — your download link is on its way.
        </p>
      )}
      <p className="text-sm text-[var(--text-muted)]">
        While you wait, browse our full collection →{' '}
        <Link href="/shop" className="text-[#A0830E] hover:underline">Arwign Shop</Link>
      </p>
    </main>
  )
}

export default function ConfirmedClient() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[var(--bg-primary,#FAF8F4)] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#A0830E] border-t-transparent animate-spin" /></main>}>
      <ConfirmedContent />
    </Suspense>
  )
}
