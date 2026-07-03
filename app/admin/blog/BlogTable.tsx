'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export interface AdminBlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image: string | null
  category: string | null
  tags: string[]
  read_time_mins: number | null
  view_count: number
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  published: { bg: 'rgba(134,239,172,0.18)', color: '#16a34a' },
  draft:     { bg: 'rgba(148,163,184,0.15)', color: '#64748b' },
  archived:  { bg: 'rgba(232,197,192,0.25)', color: '#C9847C' },
}

export default function BlogTable({ initialPosts }: { initialPosts: AdminBlogPost[] }) {
  const [posts,    setPosts]    = useState(initialPosts)
  const [deleting, setDeleting] = useState<string | null>(null)

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete')
      setPosts((p) => p.filter((post) => post.id !== id))
      toast.success('Post deleted')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--bg-subtle)' }}>
          <tr className="text-left">
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Title</th>
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Category</th>
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Views</th>
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Date</th>
            <th className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {posts.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No blog posts yet. Create your first one.
              </td>
            </tr>
          )}
          {posts.map((post) => {
            const s = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft
            return (
              <tr key={post.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{post.title}</div>
                  <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{post.slug}</div>
                </td>
                <td className="px-4 py-3">
                  {post.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}>
                      {post.category}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{ background: s.bg, color: s.color }}>
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {(post.view_count ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 text-xs">
                    <Link href={`/admin/blog/${post.id}`} className="hover:underline" style={{ color: 'var(--gold)' }}>
                      Edit
                    </Link>
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener"
                      className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                      View ↗
                    </a>
                    <button
                      disabled={deleting === post.id}
                      onClick={() => remove(post.id, post.title)}
                      className="hover:underline disabled:opacity-50"
                      style={{ color: '#C9847C' }}
                    >
                      {deleting === post.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
