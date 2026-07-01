'use client'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import {
  BookOpen, Clock, Search, X, ChevronRight, ArrowRight, Plus,
  TrendingUp, Heart, Wallet, Tablet, Sparkles,
} from 'lucide-react'
import { type BlogPost, STATIC_POSTS } from './blog-data'

export type { BlogPost }
export { STATIC_POSTS }

const CATEGORIES = ['All', 'Planning', 'Productivity', 'Digital Tools', 'Lifestyle', 'Finance', 'Wellness', 'Student Life']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Cover image with its own shimmer skeleton (no layout shift)
function CoverImage({ src, alt, sizes, priority, className }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onLoad={() => setLoaded(true)}
        className={`object-cover transition-all duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`} />
    </>
  )
}

const AUTHOR_NAME = 'The Arwign Team'

function Avatar({ size = 24 }: { size?: number }) {
  return (
    <span className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', fontSize: size * 0.45, fontFamily: 'var(--font-cormorant)' }} aria-hidden>A</span>
  )
}

const TOPICS = [
  { label: 'Productivity', cat: 'Productivity',  icon: TrendingUp },
  { label: 'Wellness',     cat: 'Wellness',      icon: Heart },
  { label: 'Finance',      cat: 'Finance',       icon: Wallet },
  { label: 'Digital Tools', cat: 'Digital Tools', icon: Tablet },
]

// Cinematic featured banner with gentle scale-on-scroll
function FeaturedCard({ post }: { post: BlogPost }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.14, 1])
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article ref={ref} className="relative rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div className="relative h-[380px] md:h-[480px] w-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
          <motion.div className="absolute inset-0" style={reduce ? undefined : { scale }}>
            <CoverImage src={post.cover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80'} alt={post.title} sizes="100vw" priority className="group-hover:scale-105 duration-700" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-7 md:p-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: 'var(--gold)', color: 'white', letterSpacing: '0.08em' }}>{post.category}</span>
            <span className="text-xs text-white/70 inline-flex items-center gap-1"><Clock size={11} /> {post.readMins} min read</span>
          </div>
          <h2 className="font-display text-3xl md:text-5xl text-white mb-2.5 group-hover:text-gold-light transition-colors leading-[1.06] max-w-3xl" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.45)' }}>{post.title}</h2>
          <p className="text-sm text-white/80 line-clamp-1 max-w-xl mb-4">{post.excerpt}</p>
          <div className="flex items-center gap-2.5 text-xs text-white/75"><Avatar size={26} /> <span className="text-white/90 font-medium">{AUTHOR_NAME}</span><span className="text-white/40">·</span><span>{formatDate(post.publishedAt)}</span></div>
        </div>
      </article>
    </Link>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <motion.article layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }}
        className="flex flex-col h-full rounded-2xl overflow-hidden border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-product"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="relative overflow-hidden flex-shrink-0" style={{ aspectRatio: '16/10', background: 'var(--bg-secondary)' }}>
          <CoverImage src={post.cover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=75'} alt={post.title} sizes="(max-width: 768px) 100vw, 33vw" className="group-hover:scale-105" />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(224,168,44,0.92)', color: 'white', letterSpacing: '0.07em' }}>{post.category}</span>
        </div>
        <div className="flex flex-col flex-1 p-5">
          <h3 className="font-display text-xl leading-snug mb-2 group-hover:text-gold transition-colors line-clamp-2" style={{ color: 'var(--text-primary)' }}>{post.title}</h3>
          <p className="text-sm leading-relaxed line-clamp-1 mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>{post.excerpt}</p>
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}><Avatar size={22} /> <span className="flex items-center gap-1"><Clock size={10} /> {post.readMins} min</span></span>
            <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>Read <ArrowRight size={11} /></span>
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
  const [visible,  setVisible]  = useState(6)

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

  useEffect(() => { setVisible(6) }, [category, search])

  const featured  = filtered[0]
  const picks     = filtered.slice(1, 3)
  const gridPosts = filtered.slice(3)

  const clearSearch = useCallback(() => setSearch(''), [])

  return (
    <div className="w-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section
        className="w-full pt-12 pb-14 border-b"
        style={{
          background: 'linear-gradient(135deg, rgba(224,168,44,0.12) 0%, rgba(184,169,212,0.08) 60%, rgba(224,168,44,0.04) 100%)',
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
                style={{ background: 'rgba(224,168,44,0.10)', borderColor: 'rgba(224,168,44,0.30)' }}
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
              {/* Cinematic featured banner */}
              {featured && <div className="mb-12"><FeaturedCard post={featured} /></div>}

              {/* Editor's picks — 2-up */}
              {picks.length > 0 && (
                <section className="mb-14">
                  <div className="flex items-center gap-2 mb-5">
                    <Sparkles size={15} style={{ color: 'var(--gold)' }} />
                    <h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Editor&rsquo;s Picks</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {picks.map((post) => <PostCard key={post.id} post={post} />)}
                  </div>
                </section>
              )}

              {/* Browse by topic — only on the unfiltered view */}
              {category === 'All' && !search && (
                <section className="mb-14">
                  <h2 className="font-display text-2xl mb-5" style={{ color: 'var(--text-primary)' }}>Browse by topic</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {TOPICS.map(({ label, cat, icon: Icon }) => (
                      <button key={cat} onClick={() => setCategory(cat)}
                        className="group flex items-center gap-3 p-5 rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-product"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}><Icon size={19} style={{ color: 'var(--gold)' }} /></span>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* All articles grid */}
              {gridPosts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
                      {category !== 'All' ? category : search ? 'Results' : 'Latest articles'}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {filtered.length} article{filtered.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gridPosts.slice(0, visible).map((post) => <PostCard key={post.id} post={post} />)}
                  </div>

                  {visible < gridPosts.length && (
                    <div className="flex justify-center mt-10">
                      <button onClick={() => setVisible((v) => v + 6)} className="btn-outline px-8">Load more <Plus size={14} /></button>
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

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
