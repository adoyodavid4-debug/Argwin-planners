'use client'

import { useEffect } from 'react'

// Last-resort boundary: catches errors thrown in the root layout itself.
// Must render its own <html>/<body> because it replaces the root layout.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#faf7f2', color: '#20161a' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: '0 0 0.75rem' }}>Something went wrong</h1>
          <p style={{ color: '#6b6058', maxWidth: 460, margin: '0 0 2rem' }}>
            We hit an unexpected error. Please try again, or reload the page.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '0.7rem 1.4rem', borderRadius: 999, border: 'none', background: '#20161a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: '0.7rem 1.4rem', borderRadius: 999, border: '1px solid #d8cfc4', color: '#20161a', textDecoration: 'none', fontWeight: 600 }}
            >
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
