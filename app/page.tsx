import { redirect } from 'next/navigation'

// Rendered per-request so the redirect always emits a fresh 307 with a proper
// Location header — a statically-cached redirect was being served without one.
export const dynamic = 'force-dynamic'

export default function RootPage() {
  redirect('/site')
}
