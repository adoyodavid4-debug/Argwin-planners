'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the browser console + Vercel logs; server-side captureError
    // handles API/route failures separately.
    console.error('[route error]', error)
  }, [error])

  return (
    <main className="container-site flex flex-col items-center justify-center text-center" style={{ minHeight: '70vh', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <h1 className="font-display mb-3" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: 'var(--text-primary)' }}>
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        We hit an unexpected error. You can try again, or head back home &mdash; your cart is saved.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-outline">Back to home</Link>
      </div>
    </main>
  )
}
