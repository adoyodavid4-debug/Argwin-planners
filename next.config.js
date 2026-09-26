/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // @react-pdf/renderer ships a yoga/wasm layout engine + font data that can't
  // be webpack-bundled — load it from node_modules at runtime, or PDF receipt
  // generation 500s on Vercel serverless.

  // Image optimization
  images: {
    // Vercel Hobby has a monthly image-optimization quota; once exhausted the
    // /_next/image optimizer returns 402 and every next/image breaks site-wide.
    // Our source images are already optimized webp served from Supabase, so we
    // skip the optimizer entirely and serve them directly. (Re-enable by
    // removing `unoptimized` if the project moves to a Pro plan.)
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    minimumCacheTTL: 3600,
  },

  // Security headers — firewall layer at the CDN/edge
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options',           value: 'DENY' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          // Referrer control
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 1 year
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Permissions policy — restrict browser APIs
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
          // Content-Security-Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://www.googletagmanager.com https://*.google-analytics.com https://www.paypalobjects.com https://www.facebook.com https://connect.facebook.net",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.paypal.com https://www.sandbox.paypal.com https://connect.facebook.net https://www.facebook.com",
              "frame-src https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // Content-hashed build assets never change at a given URL — cache forever.
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public assets live at STABLE, unhashed URLs (e.g. /products/*.png,
      // /logo.png). They must NOT be `immutable`: re-uploading a file keeps the
      // same URL, so an immutable cache pins the old/broken copy for a year and
      // never picks up the fix. Long CDN cache (Vercel invalidates it each deploy)
      // + short browser freshness with background revalidation instead.
      {
        source: '/((?!_next/).*)\\.(ico|png|jpg|jpeg|svg|webp|avif|woff2|woff)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400' },
        ],
      },
    ]
  },

  // Clean public URLs are the canonical identity (page metadata canonicals point
  // at them). We REWRITE them onto the internal /site/* routes so the clean URL
  // is what's actually served (HTTP 200) — previously these were 307 redirects,
  // which meant every canonical pointed at a redirecting URL and search engines
  // never consolidated. beforeFiles so the rewrite wins over the filesystem for
  // the bare "/" root.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/',                destination: '/site' },
        { source: '/shop',            destination: '/site/shop' },
        { source: '/shop/:path*',     destination: '/site/shop/:path*' },
        { source: '/checkout',        destination: '/site/checkout' },
        { source: '/checkout/:path*', destination: '/site/checkout/:path*' },
        { source: '/best-sellers',    destination: '/site/best-sellers' },
        { source: '/new-arrivals',    destination: '/site/new-arrivals' },
        { source: '/about',           destination: '/site/about' },
        { source: '/contact',         destination: '/site/contact' },
        { source: '/blog',            destination: '/site/blog' },
        { source: '/blog/:path*',     destination: '/site/blog/:path*' },
        { source: '/faq',             destination: '/site/faq' },
        { source: '/privacy',         destination: '/site/privacy' },
        { source: '/terms',           destination: '/site/terms' },
        { source: '/refund',          destination: '/site/refund' },
        { source: '/free/:path*',     destination: '/site/free/:path*' },
        { source: '/notebooks',       destination: '/site/notebooks' },
        { source: '/notebooks/:path*',destination: '/site/notebooks/:path*' },
        { source: '/calendar',        destination: '/site/calendar' },
        { source: '/calendar/:path*', destination: '/site/calendar/:path*' },
        { source: '/order/:id',       destination: '/site/order/:id' },
        // Unsubscribe confirmation — /api/optin/unsubscribe redirects here;
        // without this rewrite every unsubscribe click landed on a 404.
        { source: '/unsubscribed',    destination: '/site/unsubscribed' },
      ],
    }
  },

  // Legacy / alternate slugs → clean canonical URLs (permanent).
  async redirects() {
    return [
      { source: '/planners',  destination: '/shop', permanent: true },
      { source: '/products',  destination: '/shop', permanent: true },
      { source: '/shop/all',  destination: '/shop', permanent: true },
      // app/auth/register/ is an empty directory — signup lives on the login
      // page's signup tab; send any register links there instead of a 404.
      { source: '/auth/register', destination: '/auth/login?mode=signup', permanent: false },
    ]
  },
}

module.exports = nextConfig
