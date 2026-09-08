import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Set New Password — Arwign Planners',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  )
}
