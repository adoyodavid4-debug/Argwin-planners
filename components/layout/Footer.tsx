import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Youtube } from 'lucide-react'
import NewsletterForm from '@/components/home/NewsletterForm'

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

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer aria-label="Site footer" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
      {/* Newsletter Banner */}
      <div className="newsletter-gradient border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container-site py-16">
          <div className="max-w-xl mx-auto text-center">
            <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--gold)', letterSpacing: '0.12em' }}>
              Join 50,000+ Organized People
            </p>
            <h2 className="font-display text-3xl md:text-4xl mb-4" style={{ color: 'var(--text-primary)' }}>
              Get Free Planning Resources
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Subscribe for free planner printables, productivity tips, exclusive discounts, and first access to new launches.
            </p>
            <NewsletterForm source="footer" />
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
              Premium digital and printable planners designed to help you organize your life, reach your goals, and build the habits that matter most.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 hover:border-gold hover:text-gold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  aria-label={`Follow Arwign Planners on ${social.label}`}
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
              {footerLinks.shop.map((link) => (
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
              {footerLinks.company.map((link) => (
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
              {footerLinks.support.map((link) => (
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
            © {year} Arwign Planners. All rights reserved. Premium Digital & Printable Planner & Notebook Shop.
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
