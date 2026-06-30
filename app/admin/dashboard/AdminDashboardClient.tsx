'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, ShoppingBag, Package, Users, TrendingUp, Plus, Settings, FileText, Printer, BookOpen, Mail, Magnet, NotebookPen, Lightbulb } from 'lucide-react'

interface Stats {
  totalOrders:      number
  thisMonthOrders:  number
  monthRevenue:     number
  totalProducts:    number
  totalSubscribers: number
  recentOrders:     any[]
  topProducts:      any[]
}

const adminNav = [
  { label: 'Dashboard',       href: '/admin/dashboard',      icon: TrendingUp },
  { label: 'Products',        href: '/admin/products',        icon: Package },
  { label: 'Orders',          href: '/admin/orders',          icon: ShoppingBag },
  { label: 'Print Products',  href: '/admin/print-products',  icon: Printer },
  { label: 'Fulfillment',     href: '/admin/fulfillment',     icon: BookOpen },
  { label: 'Lead Magnets',    href: '/admin/lead-magnets',    icon: Magnet },
  { label: 'Subscribers',     href: '/admin/subscribers',     icon: Users },
  { label: 'Sequences',       href: '/admin/sequences',       icon: Mail },
  { label: 'Funnel Metrics',  href: '/admin/funnel',          icon: TrendingUp },
  { label: 'Notebooks',        href: '/admin/notebooks',       icon: NotebookPen },
  { label: 'Notebook Requests', href: '/admin/notebook-requests', icon: Lightbulb },
  { label: 'Blog',            href: '/admin/blog',            icon: FileText },
  { label: 'Settings',        href: '/admin/settings',        icon: Settings },
]

// Mock chart data — in production pull from analytics_events
const chartData = [
  { name: 'Mon', sales: 42 }, { name: 'Tue', sales: 67 },
  { name: 'Wed', sales: 53 }, { name: 'Thu', sales: 89 },
  { name: 'Fri', sales: 124 }, { name: 'Sat', sales: 156 },
  { name: 'Sun', sales: 98 },
]

export default function AdminDashboardClient({ stats }: { stats: Stats }) {
  const kpis = [
    { label: 'Monthly Revenue',   value: `$${stats.monthRevenue.toFixed(0)}`,  icon: DollarSign, color: 'rgba(224,168,44,0.12)',  accent: 'var(--gold)' },
    { label: 'Orders This Month', value: stats.thisMonthOrders.toLocaleString(), icon: ShoppingBag, color: 'rgba(184,169,212,0.15)', accent: '#7B6FAE' },
    { label: 'Active Products',   value: stats.totalProducts.toLocaleString(),  icon: Package,     color: 'rgba(168,181,160,0.15)', accent: '#6E7E66' },
    { label: 'Newsletter Subs',   value: stats.totalSubscribers.toLocaleString(), icon: Users,     color: 'rgba(232,197,192,0.15)', accent: '#C9847C' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside
        className="w-64 hidden lg:flex flex-col border-r sticky top-0 h-screen"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Arwign Planners"
              width={40}
              height={40}
              className="w-10 h-10 object-contain rounded-lg"
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Arwign Planners</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link href="/admin/products/new" className="btn-primary w-full justify-center text-xs">
            <Plus size={14} /> Add Product
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
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
                    cursor={{ fill: 'rgba(224,168,44,0.05)' }}
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
                        <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleDateString()}</td>
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
