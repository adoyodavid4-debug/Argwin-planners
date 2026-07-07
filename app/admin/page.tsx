// app/admin/page.tsx
// The admin area has no landing page of its own — the base /admin route
// redirects to the dashboard so admins never hit a 404 when they open it.
import { redirect } from 'next/navigation'

export default function AdminIndex() {
  redirect('/admin/dashboard')
}
