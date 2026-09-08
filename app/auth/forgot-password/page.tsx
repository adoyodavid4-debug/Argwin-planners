import type { Metadata } from 'next'
import { Suspense } from 'react'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password — Arwign Planners',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordClient />
    </Suspense>
  )
}
