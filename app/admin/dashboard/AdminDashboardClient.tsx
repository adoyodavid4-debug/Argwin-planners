'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, ShoppingBag, Package, Users, Plus, MousePointerClick, Tablet, Notebook, FileText } from 'lucide-react'
import { fmtDate } from '@/lib/calendar/fmt'

interface ClickItem { title: string; slug: string; view_count: number | null }
interface Stats {
  totalOrders:      number
  thisMonthOrders:  number
  monthRevenue:     number
  totalProducts:    number
  totalSubscribers: number
  recentOrders:     any[]
  topProducts:      any[]
  clicks: {
    plannerTotal:  number
    notebookTotal: number
    blogTotal:     number
    topPlanners:   ClickItem[]
    topNotebooks:  ClickItem[]
    topBlogs:      ClickItem[]
  }
}

// One "Clicks" panel — a total plus a ranked list of the most-clicked items.
function ClicksPanel({
  icon: Icon, label, total, items, accent,
}: {
  icon: typeof Tablet; label: string; total: number; items: ClickItem[]; accent: string
}) {
  return (
    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: accent }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</h3>
        </div>
        <span className="text-lg font-display font-semibold" style={{ color: accent }}>{total.toLocaleString()}</span>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No clicks recorded yet</p>
        ) : (
          items.map((it, i) => (
            <div key={it.slug || i} className="flex items-center gap-3">
              <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
              <p className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>{it.title}</p>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                {(it.view_count ?? 0).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// The admin sidebar nav now lives in app/admin/AdminSidebar.tsx, rendered by
// the shared app/admin/layout.tsx for every admin page.

// Mock chart data — in production pull from analytics_events
const chartData = [
  { name: 'Mon', sales: 42 }, { name: 'Tue', sales: 67 },
  { name: 'Wed', sales: 53 }, { name: 'Thu', sales: 89 },
  { name: 'Fri', sales: 124 }, { name: 'Sat', sales: 156 },
  { name: 'Sun', sales: 98 },
]

export default function AdminDashboardClient({ stats }: { stats: Stats }) {
  const kpis = [
    { label: 'Monthly Revenue',   value: `$${stats.monthRevenue.toFixed(0)}`,  icon: DollarSign, color: 'rgba(201,168,76,0.12)',  accent: 'var(--gold)' },
    { label: 'Orders This Month', value: stats.thisMonthOrders.toLocaleString(), icon: ShoppingBag, color: 'rgba(205,199,190,0.15)', accent: '#7B6FAE' },
    { label: 'Active Products',   value: stats.totalProducts.toLocaleString(),  icon: Package,     color: 'rgba(168,181,160,0.15)', accent: '#6E7E66' },
    { label: 'Newsletter Subs',   value: stats.totalSubscribers.toLocaleString(), icon: Users,     color: 'rgba(232,197,192,0.15)', accent: '#C9847C' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Main */}
      <main className="p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Welcome back — here's how Arwign is performing</p>
            </div>
            <Link href="/admin/products/new" className="btn-primary">
              <Plus size={15} /> New Planner
            </Link>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="p-5 rounded-2xl border"
                style={{ background: kpi.color, borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon size={18} style={{ color: kpi.accent }} />
                </div>
                <p className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div
              className="lg:col-span-2 p-6 rounded-2xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Sales This Week</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                    cursor={{ fill: 'rgba(201,168,76,0.05)' }}
                  />
                  <Bar dataKey="sales" fill="var(--gold)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products */}
            <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--text-primary)' }}>Top Products</h2>
              <div className="space-y-4">
                {stats.topProducts.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No products yet</p>
                ) : (
                  stats.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'var(--gold)' }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.download_count} downloads</p>
                      </div>
                      <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>${p.price}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Clicks — engagement per planner, notebook and blog */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick size={18} style={{ color: 'var(--gold)' }} />
              <h2 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>Clicks</h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— times each item was opened</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ClicksPanel icon={Tablet}   label="Planners"    total={stats.clicks.plannerTotal}  items={stats.clicks.topPlanners}  accent="var(--gold)" />
              <ClicksPanel icon={Notebook} label="Notebooks"   total={stats.clicks.notebookTotal} items={stats.clicks.topNotebooks} accent="#7B6FAE" />
              <ClicksPanel icon={FileText} label="Blog reads"  total={stats.clicks.blogTotal}     items={stats.clicks.topBlogs}     accent="#6E7E66" />
            </div>
          </div>

          {/* Recent Orders */}
          <div className="mt-6 p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Order ID', 'Email', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="pb-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No orders yet</td></tr>
                  ) : (
                    stats.recentOrders.map((order: any) => (
                      <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>#{order.id.slice(0, 8)}</td>
                        <td className="py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{order.email}</td>
                        <td className="py-3 text-xs font-bold" style={{ color: 'var(--gold)' }}>${order.amount_total?.toFixed(2)}</td>
                        <td className="py-3"><span className="badge badge-popular">{order.status}</span></td>
                        <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(order.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
