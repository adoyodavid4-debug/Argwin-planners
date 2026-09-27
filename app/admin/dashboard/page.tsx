// app/admin/dashboard/page.tsx
import type { Metadata } from 'next'
import AdminDashboardClient from './AdminDashboardClient'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export const metadata: Metadata = {
  title: 'Admin Dashboard — Arwign Planners',
  robots: { index: false, follow: false },
}

async function getStats() {
  const supabase = createServerSupabaseClient()
  const now      = new Date()
  const start    = format(startOfMonth(now), 'yyyy-MM-dd')
  const end      = format(endOfMonth(now),   'yyyy-MM-dd')

  const { data: revenueData } = await supabase
    .from('orders')
    .select('amount_total')
    .eq('status', 'completed')
    .gte('created_at', start)

  const monthRevenue = ((revenueData ?? []) as unknown as { amount_total: number }[]).reduce((sum, o) => sum + o.amount_total, 0)

  const [
    { count: totalOrders },
    { count: thisMonthOrders },
    { count: totalProducts },
    { count: totalSubscribers },
    { data: recentOrders },
    { data: topProducts },
    { data: allProducts },
    { data: allBlogs },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', start).lte('created_at', end),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id, email, amount_total, status, created_at').eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
    supabase.from('products').select('title, download_count, rating_avg, price').eq('status', 'active').order('download_count', { ascending: false }).limit(5),
    // Clicks = opens tracked per item (products.view_count / blog_posts.view_count)
    supabase.from('products').select('title, slug, product_type, view_count').eq('status', 'active'),
    supabase.from('blog_posts').select('title, slug, view_count').eq('status', 'published'),
  ])

  // Split products into planners vs notebooks and rank each by clicks.
  const products = (allProducts ?? []) as { title: string; slug: string; product_type: string | null; view_count: number | null }[]
  const blogs    = (allBlogs ?? []) as { title: string; slug: string; view_count: number | null }[]
  const planners  = products.filter((p) => p.product_type !== 'notebook')
  const notebooks = products.filter((p) => p.product_type === 'notebook')
  const sumClicks = (arr: { view_count: number | null }[]) => arr.reduce((s, x) => s + (x.view_count ?? 0), 0)
  const topBy = <T extends { view_count: number | null }>(arr: T[], n = 6) =>
    [...arr].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).filter((x) => (x.view_count ?? 0) > 0).slice(0, n)

  return {
    totalOrders:      totalOrders ?? 0,
    thisMonthOrders:  thisMonthOrders ?? 0,
    monthRevenue,
    totalProducts:    totalProducts ?? 0,
    totalSubscribers: totalSubscribers ?? 0,
    recentOrders:     recentOrders ?? [],
    topProducts:      topProducts ?? [],
    clicks: {
      plannerTotal:  sumClicks(planners),
      notebookTotal: sumClicks(notebooks),
      blogTotal:     sumClicks(blogs),
      topPlanners:   topBy(planners),
      topNotebooks:  topBy(notebooks),
      topBlogs:      topBy(blogs),
    },
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()
  return <AdminDashboardClient stats={stats} />
}
