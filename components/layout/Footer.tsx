import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Youtube, Gift, FileText, Lightbulb, Percent, Rocket, Sparkles } from 'lucide-react'
import NewsletterForm from '@/components/home/NewsletterForm'

export interface FooterLink { label: string; href: string }

export interface FooterProps {
  shopLinks?:    FooterLink[]
  companyLinks?: FooterLink[]
  supportLinks?: FooterLink[]
  socialUrls?:   { instagram?: string; youtube?: string; pinterest?: string; tiktok?: string }
  blurb?:        string
  storeName?:    string
}

const DEFAULT_BLURB = 'Premium digital and printable planners designed to help you organize your life, reach your goals, and build the habits that matter most.'

const footerLinks = {
  shop: [
    { label: 'Digital Planners',   href: '/shop/category/digital-planners' },
    { label: 'Printable Planners', href: '/shop/category/printable-planners' },
    { label: 'Budget Planners',    href: '/shop/category/budget-planners' },
    { label: 'Student Planners',   href: '/shop/category/student-planners' },
    { label: 'Wellness Planners',  href: '/shop/category/wellness-planners' },
    { label: 'Planner Bundles',    href: '/shop/category/planner-bundles' },
    { label: 'ADHD Planners',      href: '/shop/category/adhd-planners' },
    { label: 'Notion Templates',   href: '/shop/category/notion-templates' },
  ],
  company: [
    { label: 'About Arwign',       href: '/about' },
    { label: 'Blog',               href: '/blog' },
    { label: 'Best Sellers',       href: '/best-sellers' },
    { label: 'New Arrivals',       href: '/new-arrivals' },
    { label: 'Contact Us',         href: '/contact' },
    { label: 'Affiliate Program',  href: '/affiliates' },
  ],
  support: [
    { label: 'FAQ',                href: '/faq' },
    { label: 'How to Download',    href: '/blog/how-to-use-digital-planner' },
    { label: 'Customer Dashboard', href: '/customer/dashboard' },
    { label: 'Privacy Policy',     href: '/privacy-policy' },
    { label: 'Terms of Service',   href: '/terms-of-service' },
    { label: 'Refund Policy',      href: '/refund-policy' },
  ],
}

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/arwignplanners', icon: Instagram },
  { label: 'YouTube',   href: 'https://youtube.com/@arwignplanners',  icon: Youtube },
  {
    label: 'Pinterest',
    href: 'https://pinterest.com/arwignplanners',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/@arwignplanners',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
      </svg>
    ),
  },
]

export default function Footer({
  shopLinks,
  companyLinks,
  supportLinks,
  socialUrls,
  blurb,
  storeName,
}: FooterProps = {}) {
  const year = new Date().getFullYear()

  // DB-driven content wins; hardcoded arrays are the fallback so the footer
  // always renders even when props are absent or the tables are empty.
  const shop    = shopLinks    && shopLinks.length    > 0 ? shopLinks    : footerLinks.shop
  const company = companyLinks && companyLinks.length > 0 ? companyLinks : footerLinks.company
  const support = supportLinks && supportLinks.length > 0 ? supportLinks : footerLinks.support
  const footerBlurb = blurb || DEFAULT_BLURB
  const brand = storeName || 'Arwign Planners'

  const socialItems = socials.map((s) => {
    const key = s.label.toLowerCase() as keyof NonNullable<FooterProps['socialUrls']>
    const override = socialUrls?.[key]
    return { ...s, href: override || s.href }
  })

  return (
    <footer aria-label="Site footer" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
      {/* Newsletter — a contained, anchored "moment" that sits on the footer's own
          surface, so its seam is always the footer's top border — identical on every page. */}
      <div style={{ background: 'var(--bg-secondary)' }}>
        <div className="container-site pt-16 pb-4">
          <div className="relative overflow-hidden rounded-3xl border animate-fade-up"
            style={{
              background: 'linear-gradient(135deg, rgba(var(--gold-rgb),0.12) 0%, rgba(205,199,190,0.08) 55%, var(--bg-card) 100%)',
              borderColor: 'var(--border-gold)',
              boxShadow: '0 10px 40px rgba(44,42,53,0.08)',
            }}>
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-12 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(var(--gold-rgb),0.18)' }} />

            <div className="relative grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-12 p-8 sm:p-10 lg:p-12 items-center">
              {/* Content + form */}
              <div>
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-4 font-semibold px-3 py-1.5 rounded-full"
                  style={{ color: 'var(--gold-dark)', background: 'rgba(var(--gold-rgb),0.14)', letterSpacing: '0.12em' }}>
                  <Gift size={12} /> Join 50,000+ organised people
                </p>
                <h2 className="font-display text-3xl md:text-4xl mb-3" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  Get free planning resources
                </h2>
                <p className="text-sm leading-relaxed mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                  Free printables, productivity tips, exclusive discounts and first access to new launches — straight to your inbox.
                </p>

                {/* Value row */}
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
                  {[
                    { icon: FileText,  l: 'Free printables' },
                    { icon: Lightbulb, l: 'Productivity tips' },
                    { icon: Percent,   l: 'Exclusive discounts' },
                    { icon: Rocket,    l: 'First access' },
                  ].map(({ icon: Icon, l }) => (
                    <li key={l} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
                        <Icon size={15} style={{ color: 'var(--gold)' }} />
                      </span>
                      <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{l}</span>
                    </li>
                  ))}
                </ul>

                <NewsletterForm source="footer" className="max-w-md" />
                <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>No spam, ever. Unsubscribe any time.</p>
              </div>

              {/* Supporting visual (desktop) — a tasteful "free printable" mock */}
              <div className="hidden lg:flex justify-center" aria-hidden>
                <div className="relative" style={{ width: 210, height: 250 }}>
                  <div className="absolute rounded-2xl" style={{ inset: '14px 34px 22px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', transform: 'rotate(-6deg)', boxShadow: '0 14px 30px rgba(44,42,53,0.12)' }} />
                  <div className="absolute rounded-2xl overflow-hidden" style={{ inset: '0 0 12px 30px', background: '#fff', border: '1px solid var(--border)', transform: 'rotate(5deg)', boxShadow: '0 18px 42px rgba(44,42,53,0.16)' }}>
                    <div style={{ height: '34%', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={26} color="#fff" />
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      {[72, 92, 56, 82].map((w, i) => <div key={i} style={{ height: 5, width: `${w}%`, borderRadius: 3, background: 'var(--border)' }} />)}
                      <div className="grid grid-cols-3 gap-1.5 mt-1">{Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: 'var(--bg-secondary)' }} />)}</div>
                    </div>
                  </div>
                  <div className="absolute" style={{ top: 10, left: 6, background: 'var(--gold)', color: '#fff', fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', padding: '4px 11px', borderRadius: 100, transform: 'rotate(5deg)', boxShadow: '0 4px 12px rgba(201,168,76,0.4)' }}>FREE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="container-site py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex mb-6">
              <Image
                src="/logo.png"
                alt="Arwign Planners"
                width={526}
                height={92}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: 'var(--text-secondary)' }}>
              {footerBlurb}
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3">
              {socialItems.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 hover:border-gold hover:text-gold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  aria-label={`Follow ${brand} on ${social.label}`}
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
              Shop
            </h3>
            <ul className="space-y-3">
              {shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors duration-200 hover:text-gold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
              Company
            </h3>
            <ul className="space-y-3">
              {company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors duration-200 hover:text-gold" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
              Support
            </h3>
            <ul className="space-y-3">
              {support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors duration-200 hover:text-gold" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © {year} {brand}. All rights reserved. Premium Digital & Printable Planner & Notebook Shop.
          </p>
          <div className="flex items-center gap-6">
            {/* Payment badges */}
            <div className="flex items-center gap-2" aria-label="Accepted payment methods">
              {['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay'].map((method) => (
                <span
                  key={method}
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
