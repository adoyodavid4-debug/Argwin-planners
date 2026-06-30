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
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', start).lte('created_at', end),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id, email, amount_total, status, created_at').eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
    supabase.from('products').select('title, download_count, rating_avg, price').eq('status', 'active').order('download_count', { ascending: false }).limit(5),
  ])

  return {
    totalOrders:      totalOrders ?? 0,
    thisMonthOrders:  thisMonthOrders ?? 0,
    monthRevenue,
    totalProducts:    totalProducts ?? 0,
    totalSubscribers: totalSubscribers ?? 0,
    recentOrders:     recentOrders ?? [],
    topProducts:      topProducts ?? [],
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()
  return <AdminDashboardClient stats={stats} />
}
