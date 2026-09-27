'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export interface Comment {
  id: string
  author_name: string
  body: string
  created_at: string
  user_id: string
}

function initials(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase()
}

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return '' }
}

export default function BlogComments({
  postId, slug, initialComments, isLoggedIn, currentUserId,
}: {
  postId: string
  slug: string
  initialComments: Comment[]
  isLoggedIn: boolean
  currentUserId: string | null
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const text = body.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/blog/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, body: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not post comment')
      setComments((prev) => [data.comment as Comment, ...prev])
      setBody('')
      toast.success('Comment posted ✦')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete your comment?')) return
    const prev = comments
    setComments((c) => c.filter((x) => x.id !== id))
    try {
      const res = await fetch('/api/blog/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, post_id: postId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setComments(prev)
      toast.error('Could not delete')
    }
  }

  return (
    <section id="comments" className="mt-14 scroll-mt-28">
      <h2 className="font-display text-2xl flex items-center gap-2 mb-6" style={{ color: 'var(--text-primary)' }}>
        <MessageCircle size={20} style={{ color: 'var(--gold)' }} />
        Comments <span style={{ color: 'var(--text-muted)' }}>({comments.length})</span>
      </h2>

      {/* Composer */}
      {isLoggedIn ? (
        <div className="mb-8">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share your thoughts…"
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-y"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{body.length}/2000</span>
            <button type="button" onClick={submit} disabled={submitting || !body.trim()} className="btn-primary text-sm disabled:opacity-50" style={{ padding: '0.5rem 1.25rem' }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Post comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border p-5 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Link href={`/auth/login?redirect=${encodeURIComponent(`/blog/${slug}`)}`} className="font-semibold" style={{ color: 'var(--gold)' }}>Sign in</Link>
            {' '}to join the conversation.
          </p>
        </div>
      )}

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Be the first to comment.</p>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'rgba(160,131,14,0.14)', color: 'var(--gold)' }}>
                {initials(c.author_name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                  {currentUserId && c.user_id === currentUserId && (
                    <button type="button" onClick={() => remove(c.id)} aria-label="Delete comment" className="ml-auto text-xs inline-flex items-center gap-1 hover:underline" style={{ color: '#C9847C' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
