'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Bookmark, Share2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const likedKey = (id: string) => `av:liked:blog:${id}`

// Shared red→gold gradient for the heart fill + double-tap burst. Rendered once
// (by the action bar); referenced by id anywhere on the page via url(#av-heart).
export function HeartGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="av-heart" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0245E" />
          <stop offset="55%" stopColor="#D65A2E" />
          <stop offset="100%" stopColor="#A0830E" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Like state for a post: a per-browser guard (localStorage) drives the filled
// heart and prevents a single visitor from inflating the count; the count itself
// is reconciled with the server response.
export function useBlogLike(postId: string, initial: number) {
  const [count, setCount] = useState(initial)
  const [liked, setLiked] = useState(false)
  const likedRef = useRef(false)

  useEffect(() => {
    let on = false
    try { on = !!localStorage.getItem(likedKey(postId)) } catch { /* ignore */ }
    likedRef.current = on
    setLiked(on)
  }, [postId])

  const send = (op: 'like' | 'unlike') =>
    fetch('/api/blog/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId, op }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.like_count === 'number') setCount(d.like_count) })
      .catch(() => {})

  // Only called from user events, so React strict-mode re-renders can't double-fire it.
  const apply = useCallback((next: boolean) => {
    if (next === likedRef.current) return
    likedRef.current = next
    setLiked(next)
    setCount((c) => Math.max(0, c + (next ? 1 : -1)))
    try { next ? localStorage.setItem(likedKey(postId), '1') : localStorage.removeItem(likedKey(postId)) } catch { /* ignore */ }
    send(next ? 'like' : 'unlike')
  }, [postId])

  const like   = useCallback(() => apply(true), [apply])            // double-tap: like only
  const toggle = useCallback(() => apply(!likedRef.current), [apply]) // heart button: on/off

  return { count, liked, like, toggle }
}

function ActionButton({
  onClick, active, activeColor = 'var(--gold)', label, children, disabled,
}: {
  onClick: () => void; active?: boolean; activeColor?: string; label: string; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-medium transition-all duration-200 disabled:opacity-50"
      style={{
        borderColor: active ? activeColor : 'var(--border)',
        background:  active ? 'rgba(160,131,14,0.08)' : 'var(--bg-card)',
        color:       active ? activeColor : 'var(--text-secondary)',
      }}>
      {children}
    </button>
  )
}

export function BlogActionBar({
  postId, slug, title, likeCount, liked, onToggleLike, initialSaved, isLoggedIn, commentCount, onJumpToComments,
}: {
  postId: string
  slug: string
  title: string
  likeCount: number
  liked: boolean
  onToggleLike: () => void
  initialSaved: boolean
  isLoggedIn: boolean
  commentCount: number
  onJumpToComments: () => void
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)

  const toggleSave = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/blog/${slug}`)}`)
      return
    }
    const next = !saved
    setSaved(next)
    setBusy(true)
    try {
      const res = await fetch('/api/blog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, save: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next ? 'Saved to your Best Reads ✦' : 'Removed from Best Reads')
    } catch {
      setSaved(!next)
      toast.error('Could not update — try again')
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://www.arwignplanners.com/blog/${slug}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, url }); return } catch { /* cancelled — fall through */ }
    }
    try { await navigator.clipboard.writeText(url); toast.success('Link copied ✦') } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 py-5 border-y my-8" style={{ borderColor: 'var(--border)' }}>
      <HeartGradientDefs />

      {/* Like */}
      <button type="button" onClick={onToggleLike} aria-pressed={liked} aria-label={liked ? 'Unlike this article' : 'Like this article'}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm font-semibold transition-all duration-200"
        style={{ borderColor: liked ? '#D65A2E' : 'var(--border)', background: liked ? 'rgba(214,90,46,0.08)' : 'var(--bg-card)', color: liked ? '#C43E52' : 'var(--text-secondary)' }}>
        <motion.span
          key={liked ? 'on' : 'off'}
          initial={false}
          animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
          style={{ display: 'inline-flex' }}
        >
          <Heart size={17} fill={liked ? 'url(#av-heart)' : 'none'} stroke={liked ? 'url(#av-heart)' : 'currentColor'} />
        </motion.span>
        <span>{likeCount.toLocaleString()}</span>
      </button>

      {/* Comments jump */}
      <ActionButton onClick={onJumpToComments} label="Jump to comments">
        <MessageCircle size={16} /> {commentCount.toLocaleString()}
      </ActionButton>

      <div className="flex-1" />

      {/* Save to Best Reads */}
      <ActionButton onClick={toggleSave} active={saved} label={saved ? 'Remove from Best Reads' : 'Save to Best Reads'} disabled={busy}>
        <Bookmark size={16} fill={saved ? 'var(--gold)' : 'none'} /> {saved ? 'Saved' : 'Save'}
      </ActionButton>

      {/* Share */}
      <ActionButton onClick={share} label="Share this article">
        <Share2 size={16} /> Share
      </ActionButton>
    </div>
  )
}

// Big heart that pops on a double-tap of the article, at the tap location.
export function HeartBurst({ burst }: { burst: { id: number; x: number; y: number } | null }) {
  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.25, 1.1, 1.4] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ position: 'absolute', left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 20 }}
          aria-hidden
        >
          <Heart size={84} fill="url(#av-heart)" stroke="url(#av-heart)" style={{ filter: 'drop-shadow(0 4px 18px rgba(214,90,46,0.45))' }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
