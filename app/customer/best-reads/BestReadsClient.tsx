'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BookmarkX, Clock, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export interface SavedPost {
  id: string
  title: string
  slug: string
  excerpt: string
  cover: string
  category: string
  readMins: number
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80'

export default function BestReadsClient({ initialPosts }: { initialPosts: SavedPost[] }) {
  const [posts, setPosts] = useState(initialPosts)

  const unsave = async (id: string) => {
    const prev = posts
    setPosts((p) => p.filter((x) => x.id !== id))
    try {
      const res = await fetch('/api/blog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: id, save: false }),
      })
      if (!res.ok) throw new Error()
      toast.success('Removed from Best Reads')
    } catch {
      setPosts(prev)
      toast.error('Could not remove — try again')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="container-site h-16 flex items-center justify-between">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-gold" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={15} /> All articles
          </Link>
          <Link href="/customer/dashboard" className="text-sm font-medium" style={{ color: 'var(--gold)' }}>My account</Link>
        </div>
      </div>

      <div className="container-site py-10 md:py-14">
        <div className="flex items-center gap-2.5 mb-2">
          <BookOpen size={22} style={{ color: 'var(--gold)' }} />
          <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>Best Reads</h1>
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Articles you&apos;ve saved to return to.
        </p>

        {posts.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              You haven&apos;t saved any articles yet. Tap the <strong>Save</strong> button on any post to add it here.
            </p>
            <Link href="/blog" className="btn-primary text-sm">Browse the blog</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
              <div key={p.id} className="group relative rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => unsave(p.id)} aria-label="Remove from Best Reads"
                  className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}>
                  <BookmarkX size={15} />
                </button>
                <Link href={`/blog/${p.slug}`} className="block">
                  <div className="relative h-40 overflow-hidden">
                    <Image src={p.cover || FALLBACK_IMG} alt={p.title} fill loading="lazy" sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(160,131,14,0.92)', color: 'white', letterSpacing: '0.07em' }}>{p.category}</span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-lg leading-snug mb-2 transition-colors group-hover:text-gold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.title}</h2>
                    {p.excerpt && <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{p.excerpt}</p>}
                    <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Clock size={10} /> {p.readMins} min read</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
