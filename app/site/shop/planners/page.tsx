import { redirect } from 'next/navigation'

export default function PlannersShortcut({ searchParams }: { searchParams: Record<string, string> }) {
  const qs = new URLSearchParams(searchParams as Record<string, string>).toString()
  redirect(`/site/shop/category/digital-planners${qs ? `?${qs}` : ''}`)
}
