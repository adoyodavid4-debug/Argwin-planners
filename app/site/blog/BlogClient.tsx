'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Clock, Eye, Search, X, ChevronRight, ArrowRight, Tag,
} from 'lucide-react'
import { type BlogPost, STATIC_POSTS } from './blog-data'

export type { BlogPost }
export { STATIC_POSTS }

const CATEGORIES = ['All', 'Planning', 'Productivity', 'Digital Tools', 'Lifestyle', 'Finance', 'Wellness', 'Student Life']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden border"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="relative h-[420px] w-full overflow-hidden">
            <Image
              src={post.cover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'var(--gold)', color: 'white', letterSpacing: '0.08em' }}
              >
                {post.category}
              </span>
              <span className="text-xs text-white/70">Featured</span>
            </div>
            <h2
              className="font-display text-3xl md:text-4xl text-white mb-3 group-hover:text-gold-light transition-colors leading-tight"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
            >
              {post.title}
            </h2>
            <p className="text-sm text-white/80 line-clamp-2 mb-4 max-w-2xl">{post.excerpt}</p>
            <div className="flex items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1"><Clock size={11} /> {post.readMins} min read</span>
              <span className="flex items-center gap-1"><Eye size={11} /> {post.viewCount.toLocaleString()} views</span>
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          </div>
        </motion.article>
      </Link>
    )
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <motion.article
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col h-full rounded-2xl overflow-hidden border transition-all duration-300 group-hover:-translate-y-1"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 2px 8px rgba(44,42,53,0.04)' }}
      >
        {/* Cover */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          <Image
            src={post.cover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=75'}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(201,168,76,0.92)', color: 'white', letterSpacing: '0.07em' }}
            >
              {post.category}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          <h3
            className="font-display text-xl leading-snug mb-2 group-hover:text-gold transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </h3>
          <p className="text-sm leading-relaxed line-clamp-3 mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
            {post.excerpt}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1"><Clock size={10} /> {post.readMins} min</span>
              <span className="flex items-center gap-1"><Eye size={10} /> {post.viewCount.toLocaleString()}</span>
            </div>
            <span className="text-xs font-medium flex items-center gap-1 transition-colors" style={{ color: 'var(--gold)' }}>
              Read <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  )
}

interface Props {
  posts:        BlogPost[]
  searchParams: { category?: string; q?: string; page?: string }
}

export default function BlogClient({ posts, searchParams }: Props) {
  const [search,   setSearch]   = useState(searchParams.q ?? '')
  const [category, setCategory] = useState(searchParams.category ?? 'All')

  const filtered = useMemo(() => {
    let list = [...posts]
    if (category !== 'All') list = list.filter((p) => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [posts, category, search])

  const featured  = filtered[0]
  const rest      = filtered.slice(1)

  const clearSearch = useCallback(() => setSearch(''), [])

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section
        className="w-full pt-12 pb-14 border-b"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(184,169,212,0.08) 60%, rgba(201,168,76,0.04) 100%)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="container-site">
          <nav className="flex items-center gap-1.5 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }} className="hover:text-gold transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--text-primary)' }}>Blog</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5"
                style={{ background: 'rgba(201,168,76,0.10)', borderColor: 'rgba(201,168,76,0.30)' }}
              >
                <BookOpen size={13} style={{ color: 'var(--gold)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold-dark)', letterSpacing: '0.1em' }}>
                  Planning Tips &amp; Inspiration
                </span>
              </div>
              <h1
                className="font-display mb-4"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 3.75rem)', lineHeight: 1.05, color: 'var(--text-primary)' }}
              >
                The Arwign{' '}
                <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Blog</em>
              </h1>
              <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'var(--text-secondary)' }}>
                Practical planning guides, digital tool deep-dives, habit science, and lifestyle inspiration — written for people who take their time seriously.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex gap-8 flex-shrink-0"
            >
              {[
                { value: `${posts.length}+`, label: 'Articles' },
                { value: '5',               label: 'Categories' },
                { value: 'Free',            label: 'Always' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Filters ───────────────────────────────────────── */}
      <div
        className="sticky top-[var(--nav-height,88px)] z-30 border-b py-3"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="container-site">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`category-pill ${category === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="input-field pl-8 pr-8 py-2 text-sm"
                style={{ width: 200 }}
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="container-site py-10">

        {filtered.length === 0 ? (
          <div
            className="text-center py-24 rounded-3xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <BookOpen size={36} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-display text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>No articles found</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Try a different category or clear your search.</p>
            <button onClick={() => { setSearch(''); setCategory('All') }} className="btn-outline">
              Show All Articles
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${category}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Featured post */}
              {featured && (
                <div className="mb-10">
                  <PostCard post={featured} featured />
                </div>
              )}

              {/* Grid */}
              {rest.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {filtered.length} article{filtered.length !== 1 ? 's' : ''}
                      {category !== 'All' && ` in ${category}`}
                      {search && ` matching "${search}"`}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Newsletter CTA ────────────────────────────────── */}
      <section
        className="border-t py-16"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(184,169,212,0.07) 60%, rgba(201,168,76,0.04) 100%)',
        }}
      >
        <div className="container-site max-w-2xl mx-auto text-center">
          <div className="divider-gold mb-6" />
          <h2 className="font-display text-3xl mb-3" style={{ color: 'var(--text-primary)' }}>
            Get new articles in your inbox
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Planning tips, productivity guides, and new planner announcements — delivered free, never spammy.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="input-field flex-1 text-sm"
            />
            <button type="submit" className="btn-primary text-sm whitespace-nowrap">
              Subscribe Free
            </button>
          </form>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            No spam. Unsubscribe any time.
          </p>
        </div>
      </section>

      {/* ── Browse Shop CTA ───────────────────────────────── */}
      <section className="border-t py-12" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Ready to put these tips into practice? Explore the planners.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/shop" className="btn-primary">
              Shop All Planners <ArrowRight size={14} />
            </Link>
            <Link href="/best-sellers" className="btn-outline">Best Sellers</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
