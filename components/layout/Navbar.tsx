'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Search, Heart, Menu, X, Sun, Moon, ChevronDown } from 'lucide-react'
import { useCartStore, useUIStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'

export interface NavItem {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

const DEFAULT_ANNOUNCEMENT = '✦ Free instant download on all digital planners · Shop Now ✦'

const navLinks: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  {
    label: 'Digital Planners',
    href: '/categories',
    children: [
      { label: 'Digital Planners',   href: '/shop/category/digital-planners' },
      { label: 'Printable Planners', href: '/shop/category/printable-planners' },
      { label: 'Budget Planners',    href: '/shop/category/budget-planners' },
      { label: 'Student Planners',   href: '/shop/category/student-planners' },
      { label: 'Wellness Planners',  href: '/shop/category/wellness-planners' },
      { label: 'Business Planners',  href: '/shop/category/business-planners' },
      { label: 'Habit Trackers',     href: '/shop/category/habit-trackers' },
      { label: 'ADHD Planners',      href: '/shop/category/adhd-planners' },
      { label: 'Planner Bundles',    href: '/shop/category/planner-bundles' },
      { label: 'Digital Notebooks',  href: '/notebooks' },
    ],
  },
  {
    label: 'Digital Notebooks',
    href: '/notebooks',
    children: [
      { label: 'Ready-Made vs Personalised', href: '/site#digital-notebooks' },
      { label: 'Personalized Notebooks',     href: '/notebooks/personalized' },
      { label: 'General Notebooks',          href: '/notebooks/general' },
    ],
  },
  { label: 'Arwign Calendar', href: '/calendar' },
  { label: 'Best Sellers', href: '/best-sellers' },
  { label: 'New Arrivals', href: '/new-arrivals' },
  { label: 'Blog',         href: '/blog' },
  { label: 'About',        href: '/about' },
  { label: 'Reviews',      href: '/site#testimonials-heading' },
  { label: 'Contact',      href: '/site/contact' },
]

export default function Navbar({
  links,
  announcement,
}: {
  links?: NavItem[]
  announcement?: string
} = {}) {
  // DB-driven links/announcement win; hardcoded fallbacks keep the navbar
  // rendering even if the props are absent or the tables are empty.
  const items = links && links.length > 0 ? links : navLinks
  const announcementText = announcement || DEFAULT_ANNOUNCEMENT

  const [scrolled,      setScrolled]      = useState(false)
  const [dropdownOpen,  setDropdownOpen]  = useState<string | null>(null)
  const [mounted,       setMounted]       = useState(false)
  const { theme, setTheme }              = useTheme()
  const pathname                         = usePathname()
  const itemCount                        = useCartStore((s) => s.itemCount)
  const { setCartOpen, setSearchOpen, mobileNavOpen, setMobileNavOpen } = useUIStore()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      {/* ── Announcement Bar ─────────────────────────────── */}
      <div
        className="text-center py-2.5 px-4 text-xs font-medium tracking-widest uppercase"
        style={{ background: 'var(--gold)', color: 'white', letterSpacing: '0.1em' }}
      >
        {announcementText}
      </div>

      {/* ── Main Nav ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 transition-all duration-500 border-b"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--border)',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <nav
          className="container-site flex items-center justify-between gap-2 h-16 sm:h-20 lg:h-22"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center group min-w-0 shrink">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="relative rounded-xl overflow-hidden dark:bg-white/90 dark:px-2 dark:py-1 transition-all duration-300"
            >
              <Image
                src="/logo.png"
                alt="Arwign Planners"
                width={526}
                height={92}
                sizes="(max-width: 640px) 200px, 240px"
                className="h-8 max-[349px]:h-7 sm:h-10 w-auto max-w-full object-contain mix-blend-multiply dark:mix-blend-normal drop-shadow-[0_2px_12px_rgba(var(--gold-rgb),0.35)] group-hover:drop-shadow-[0_4px_20px_rgba(var(--gold-rgb),0.55)] transition-all duration-300"
                priority
              />
            </motion.div>
          </Link>

          {/* Desktop Links */}
          <ul className="hidden lg:flex items-center gap-1" role="menubar">
            {items.map((link) => (
              <li key={`${link.label}-${link.href}`} role="none" className="relative"
                onMouseEnter={() => link.children && setDropdownOpen(link.label)}
                onMouseLeave={() => setDropdownOpen(null)}
              >
                {link.children ? (
                  <>
                    <button
                      role="menuitem"
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen === link.label}
                      className="flex items-center gap-1 btn-ghost text-sm"
                      style={{ color: pathname.startsWith(link.href) ? 'var(--gold)' : 'var(--text-secondary)' }}
                    >
                      {link.label}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${dropdownOpen === link.label ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {dropdownOpen === link.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{  opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-2xl p-2 border shadow-glass-md"
                          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
                          role="menu"
                        >
                          {link.children.map((child) => (
                            <Link
                              key={`${child.label}-${child.href}`}
                              href={child.href}
                              role="menuitem"
                              className="flex items-center px-4 py-2.5 text-sm rounded-xl transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jost)' }}
                              onClick={() => setDropdownOpen(null)}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    href={link.href}
                    role="menuitem"
                    className="btn-ghost text-sm"
                    style={{ color: pathname === link.href ? 'var(--gold)' : 'var(--text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Right Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-icon"
              aria-label="Open search"
            >
              <Search size={18} />
            </button>

            {/* Wishlist */}
            <Link href="/customer/dashboard?tab=wishlist" className="btn-icon hidden sm:inline-flex" aria-label="Wishlist">
              <Heart size={18} />
            </Link>

            {/* Theme Toggle — lives in the mobile drawer on phones */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="btn-icon hidden md:inline-flex"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <AnimatePresence mode="wait">
                  {theme === 'dark' ? (
                    <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Sun size={18} />
                    </motion.div>
                  ) : (
                    <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="btn-icon relative"
              aria-label={`Cart, ${itemCount()} items`}
            >
              <ShoppingCart size={18} />
              {itemCount() > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4.5 h-4.5 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gold)', minWidth: '18px', minHeight: '18px', fontSize: '10px' }}
                >
                  {itemCount()}
                </motion.span>
              )}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="btn-icon lg:hidden"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
            >
              <AnimatePresence mode="wait">
                {mobileNavOpen ? (
                  <motion.div key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }} transition={{ duration: 0.15 }}>
                    <X size={20} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }} transition={{ duration: 0.15 }}>
                    <Menu size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Nav Drawer ─────────────────────────────── */}
      <div className={`mobile-nav-overlay ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{  x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 max-w-[85vw] z-[99] shadow-glass-lg overflow-y-auto"
            style={{ background: 'var(--bg-card)' }}
            aria-label="Mobile navigation"
          >
            <div className="p-6 pt-20">
              <nav>
                <ul className="space-y-1">
                  {items.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="block px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {link.label}
                      </Link>
                      {link.children && link.children.length > 0 && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {link.children.map((child) => (
                            <li key={`${child.label}-${child.href}`}>
                              <Link
                                href={child.href}
                                className="block px-4 py-2 rounded-lg text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: 'var(--text-secondary)' }}
                                onClick={() => setMobileNavOpen(false)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex md:hidden items-center gap-3 w-full px-4 py-3 mb-3 rounded-xl text-base font-medium transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jost)' }}
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                )}
                <Link href="/auth/login" className="btn-outline w-full justify-center mb-3">Sign In</Link>
                <Link href="/auth/register" className="btn-primary w-full justify-center">Create Account</Link>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
