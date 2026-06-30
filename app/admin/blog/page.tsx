import type { Metadata } from 'next'
import Link from 'next/link'
import { STATIC_POSTS } from '@/app/site/blog/blog-data'

export const metadata: Metadata = {
  title: 'Blog — Admin',
  robots: { index: false, follow: false },
}

export default function AdminBlogPage() {
  const posts = STATIC_POSTS

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <div className="sticky top-0 z-40 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
              ← Dashboard
            </Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Blog Posts</h1>
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
              {posts.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-subtle)' }}>
              <tr className="text-left">
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Title</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Category</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Published</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Read time</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Views</th>
                <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--border)' }} className="divide-y divide-[var(--border)]">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{post.title}</div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{post.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {post.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {post.readMins} min
                  </td>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {post.viewCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/site/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs hover:underline"
                      style={{ color: 'var(--gold)' }}
                    >
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Posts are currently managed as static data in <code className="font-mono">app/site/blog/blog-data.ts</code>.
        </p>
      </div>
    </div>
  )
}
