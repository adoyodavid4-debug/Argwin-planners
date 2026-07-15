// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Serif_Display, Jost, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { GoogleAnalytics } from '@next/third-parties/google'
import { OrganizationSchema } from '@/components/seo/JsonLd'
import './globals.css'

// Self-hosted via next/font — no render-blocking Google Fonts CSS request on
// mobile. Only Jost (body text) is preloaded; the display serifs load with
// swap so first paint is never blocked on them.
const jost = Jost({
  subsets: ['latin'],
  variable: '--nf-jost',
  display: 'swap',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--nf-cormorant',
  display: 'swap',
  preload: false,
})
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--nf-dm-serif',
  display: 'swap',
  preload: false,
})
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--nf-playfair',
  display: 'swap',
  preload: false,
})

const fontVars = `${jost.variable} ${cormorant.variable} ${dmSerif.variable} ${playfair.variable}`

export const metadata: Metadata = {
  metadataBase: new URL('https://www.arwignplanners.com'),
  title: {
    default: 'Arwign Planners — Premium Digital & Printable Planners',
    template: '%s | Arwign Planners',
  },
  description:
    'Download premium digital planners, notebooks, printable planners, budget trackers, habit trackers, and wellness planners. The ultimate productivity planner & notebook shop for professionals, students, and moms.',
  keywords: [
    'digital planner', 'printable planner', 'productivity planner',
    'daily planner', 'weekly planner', 'budget planner', 'goal tracker',
    'habit tracker', 'planner for students', 'planner for moms',
    'GoodNotes planner', 'iPad planner', 'undated planner',
    'wellness planner', 'ADHD planner', 'planner bundles',
    'Notion templates', 'life planner', 'digital organization tools',
    'downloadable planners', 'planner templates', 'Etsy planner alternative',
  ],
  authors: [{ name: 'Arwign Planners', url: 'https://www.arwignplanners.com' }],
  creator: 'Arwign Planners',
  publisher: 'Arwign Planners',
  category: 'productivity',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.arwignplanners.com',
    siteName: 'Arwign Planners',
    title: 'Arwign Planners — Premium Digital & Printable Planners',
    description: 'Download premium digital planners, printable planners, and productivity tools. Plan your best life with Arwign.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Arwign Planners — Plan Your Best Life' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Arwign Planners — Premium Digital & Printable Planners',
    description: 'Premium digital planners, printable planners, and productivity tools.',
    images: ['/twitter-card.jpg'],
    creator: '@arwignplanners',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    other: [
      { rel: 'android-chrome', url: '/android-chrome-192x192.png', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.png', sizes: '512x512' },
    ],
  },

  manifest: '/site.webmanifest',

  alternates: {
    canonical: 'https://www.arwignplanners.com',
    languages: {
      'en-US': 'https://www.arwignplanners.com',
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F4' },
    { media: '(prefers-color-scheme: dark)',  color: '#1A1820' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Lets env(safe-area-inset-*) work on notched phones (sticky CTA spacing).
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <OrganizationSchema />
      </head>
      <body className="grain">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontFamily: 'var(--font-jost)',
                fontSize: '0.875rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#A0830E', secondary: 'white' } },
            }}
          />
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
