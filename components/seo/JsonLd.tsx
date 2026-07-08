// Type-safe JSON-LD components — one per schema type.
// All render a <script type="application/ld+json"> in the <head> (via Next.js <head> injection or direct JSX).

interface BaseProps { children?: never }

// ─── Shared helpers ──────────────────────────────────────────────────────────

const BASE = 'https://arwignplanners.com'

function Script({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ─── Organization + WebSite ──────────────────────────────────────────────────

export function OrganizationSchema(_props: BaseProps = {}) {
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${BASE}/#org`,
          name: 'Arwign Planners',
          url: BASE,
          logo: `${BASE}/logo.png`,
          description: 'Premium digital and printable planners for productivity, wellness, and organization.',
          sameAs: [
            'https://instagram.com/arwignplanners',
            'https://youtube.com/@arwignplanners',
            'https://pinterest.com/arwignplanners',
            'https://tiktok.com/@arwignplanners',
          ],
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@arwignplanners.com' },
        },
        {
          '@type': 'WebSite',
          '@id': `${BASE}/#website`,
          url: BASE,
          name: 'Arwign Planners',
          publisher: { '@id': `${BASE}/#org` },
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/shop?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    }} />
  )
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductSchemaProps {
  name: string
  description: string
  images: string[]
  price: number
  currency?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  url: string
  sku?: string
  ratingValue?: number
  reviewCount?: number
  priceValidUntil?: string
}

export function ProductSchema({ name, description, images, price, currency = 'USD', availability = 'InStock', url, sku, ratingValue, reviewCount, priceValidUntil }: ProductSchemaProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images,
    brand: { '@type': 'Brand', name: 'Arwign Planners' },
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      url,
      ...(priceValidUntil ? { priceValidUntil } : {}),
    },
    ...(sku ? { sku } : {}),
  }

  // Only include aggregateRating when real review data exists
  if (ratingValue && reviewCount && reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      reviewCount,
      bestRating: '5',
      worstRating: '1',
    }
  }

  return <Script data={data} />
}

// ─── Organization reviews (real, DB-backed testimonials only) ────────────────
// Only render this when actual testimonial rows exist — never for hardcoded
// placeholder/fallback copy, so every Review in the markup is genuine.

export interface OrgReviewItem { author: string; ratingValue: number; reviewBody: string }

export function OrganizationReviewSchema({
  ratingValue,
  reviewCount,
  reviews,
}: {
  ratingValue: number
  reviewCount: number
  reviews: OrgReviewItem[]
}) {
  if (reviewCount <= 0) return null
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${BASE}/#org`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingValue.toFixed(1),
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
      review: reviews.slice(0, 10).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: { '@type': 'Rating', ratingValue: r.ratingValue, bestRating: '5', worstRating: '1' },
        reviewBody: r.reviewBody,
      })),
    }} />
  )
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

export interface BreadcrumbItem { name: string; url: string }

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    }} />
  )
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

export interface FaqItem { question: string; answer: string }

export function FaqSchema({ items }: { items: FaqItem[] }) {
  if (!items.length) return null
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    }} />
  )
}

// ─── ItemList (collection / bundle) ──────────────────────────────────────────

export interface ItemListEntry { name: string; url: string; position: number }

export function ItemListSchema({ name, url, items }: { name: string; url: string; items: ItemListEntry[] }) {
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name,
      url,
      itemListElement: items.map((item) => ({
        '@type': 'ListItem',
        position: item.position,
        name: item.name,
        url: item.url,
      })),
    }} />
  )
}

// ─── Article / BlogPosting ────────────────────────────────────────────────────

export interface ArticleSchemaProps {
  headline: string
  description: string
  image?: string
  url: string
  datePublished: string
  dateModified?: string
  authorName?: string
}

export function ArticleSchema({ headline, description, image, url, datePublished, dateModified, authorName = 'Arwign Planners' }: ArticleSchemaProps) {
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline,
      description,
      ...(image ? { image: [image] } : {}),
      url,
      datePublished,
      ...(dateModified ? { dateModified } : {}),
      author: { '@type': 'Person', name: authorName },
      publisher: { '@type': 'Organization', name: 'Arwign Planners', logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    }} />
  )
}

// ─── HowTo ───────────────────────────────────────────────────────────────────

export interface HowToStep { name: string; text: string; image?: string }

export function HowToSchema({ name, description, steps }: { name: string; description: string; steps: HowToStep[] }) {
  return (
    <Script data={{
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name,
      description,
      step: steps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.name,
        text: s.text,
        ...(s.image ? { image: s.image } : {}),
      })),
    }} />
  )
}
