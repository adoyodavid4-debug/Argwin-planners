/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Image optimization
  images: {
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
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://www.googletagmanager.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://www.paypal.com https://www.sandbox.paypal.com",
              "frame-src https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|webp|avif|woff2|woff)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // Redirects for SEO + route mapping (site/* pages served at clean URLs)
  async redirects() {
    return [
      // Clean URL → site layout segment
      { source: '/shop',            destination: '/site/shop',            permanent: false },
      { source: '/shop/:path*',     destination: '/site/shop/:path*',     permanent: false },

      // Checkout flow
      { source: '/checkout',        destination: '/site/checkout',        permanent: false },
      { source: '/checkout/:path*', destination: '/site/checkout/:path*', permanent: false },

      // Site pages
      { source: '/best-sellers',    destination: '/site/best-sellers',    permanent: false },
      { source: '/new-arrivals',    destination: '/site/new-arrivals',    permanent: false },
      { source: '/about',           destination: '/site/about',           permanent: false },
      { source: '/contact',         destination: '/site/contact',         permanent: false },
      { source: '/blog',            destination: '/site/blog',            permanent: false },
      { source: '/blog/:path*',     destination: '/site/blog/:path*',     permanent: false },

      // Notebooks
      { source: '/notebooks',       destination: '/site/notebooks',       permanent: false },
      { source: '/notebooks/:path*',destination: '/site/notebooks/:path*',permanent: false },

      // Arwign Calendar
      { source: '/calendar',        destination: '/site/calendar',        permanent: false },
      { source: '/calendar/:path*', destination: '/site/calendar/:path*', permanent: false },

      // Order status
      { source: '/order/:id',       destination: '/site/order/:id',       permanent: false },

      // Legacy / alternate slugs
      { source: '/planners',        destination: '/site/shop',            permanent: true },
      { source: '/products',        destination: '/site/shop',            permanent: true },
      { source: '/shop/all',        destination: '/site/shop',            permanent: true },
    ]
  },
}

module.exports = nextConfig
