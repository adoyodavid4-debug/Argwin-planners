'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, ArrowRight, BookOpen, Sparkles, Newspaper } from 'lucide-react'
import { useUIStore } from '@/lib/store'

// Popular searches double as one-tap category jumps. Hrefs hit the same
// clean routes the navbar uses; the free-text box submits to /shop?q= which
// ShopClient already reads and filters on.
const POPULAR: { label: string; href: string }[] = [
  { label: 'Digital Planners',   href: '/shop/category/digital-planners' },
  { label: 'Budget Planners',    href: '/shop/category/budget-planners' },
  { label: 'Student Planners',   href: '/shop/category/student-planners' },
  { label: 'Habit Trackers',     href: '/shop/category/habit-trackers' },
  { label: 'Wellness Planners',  href: '/shop/category/wellness-planners' },
  { label: 'Planner Bundles',    href: '/shop/category/planner-bundles' },
]

const QUICK_LINKS: { label: string; href: string; icon: typeof BookOpen }[] = [
  { label: 'Shop all planners',   href: '/shop',                   icon: Sparkles },
  { label: 'Digital Notebooks',   href: '/notebooks',              icon: BookOpen },
  { label: 'Personalised',        href: '/notebooks/personalized', icon: Sparkles },
  { label: 'Read the blog',       href: '/blog',                   icon: Newspaper },
]

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Autofocus the field, lock background scroll, and close on Escape while open.
  useEffect(() => {
    if (!searchOpen) return
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [searchOpen, setSearchOpen])

  const go = (href: string) => {
    setSearchOpen(false)
    setQuery('')
    router.push(href)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    go(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
  }

  return (
    <div
      className={`search-overlay ${searchOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Search the store"
      aria-hidden={!searchOpen}
    >
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{  opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="container-site w-full max-w-2xl mx-auto px-4"
            style={{ paddingTop: 'clamp(4rem, 12vh, 8rem)' }}
          >
            {/* Close */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSearchOpen(false)}
                className="btn-icon"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search field */}
            <form onSubmit={submit} className="relative">
              <Search
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search planners, trackers, notebooks…"
                aria-label="Search query"
                className="input-field !pl-14 !pr-28 !py-4 text-base"
                style={{ fontSize: '1.05rem' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); inputRef.current?.focus() }}
                  className="absolute right-24 top-1/2 -translate-y-1/2 p-1"
                  aria-label="Clear search"
                >
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
              <button
                type="submit"
                className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 !py-2 !px-4 text-sm"
                aria-label="Search"
              >
                Search <ArrowRight size={15} />
              </button>
            </form>

            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Press <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ borderColor: 'var(--border)' }}>Enter</kbd> to search ·
              <kbd className="ml-1 px-1.5 py-0.5 rounded border text-[10px]" style={{ borderColor: 'var(--border)' }}>Esc</kbd> to close
            </p>

            {/* Popular searches */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} style={{ color: 'var(--gold)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
                  Popular searches
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                  <button
                    key={p.href}
                    onClick={() => go(p.href)}
                    className="px-3.5 py-2 rounded-full text-sm font-medium border transition-all hover:border-gold"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>
                Jump to
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_LINKS.map((l) => {
                  const Icon = l.icon
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all hover:border-gold"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--gold)' }} />
                      <span className="text-sm font-medium">{l.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
