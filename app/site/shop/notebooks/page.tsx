import { redirect } from 'next/navigation'

export default function NotebooksShortcut({ searchParams }: { searchParams: Record<string, string> }) {
  const qs = new URLSearchParams(searchParams as Record<string, string>).toString()
  redirect(`/site/shop/category/digital-notebooks${qs ? `?${qs}` : ''}`)
}
