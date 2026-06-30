import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  ProductSchema,
  BreadcrumbSchema,
  FaqSchema,
  HowToSchema,
  ItemListSchema,
} from '@/components/seo/JsonLd'
import { OptInForm } from '@/components/funnel/OptInForm'

const BASE = 'https://arwignplanners.com'

interface Props {
  params: { slug: string }
}

async function getProduct(slug: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select(`
      id, title, title_fr, slug, description, description_fr,
      price, compare_price, currency, images, thumbnail, og_image,
      file_formats, page_count, file_size_mb,
      is_bundle, bundle_items,
      rating_avg, rating_count, status, updated_at,
      category:categories(name, name_fr, slug),
      product_faqs(question, question_fr, answer, answer_fr, sort_order)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return data
}

async function getBundleItems(ids: string[]) {
  if (ids.length === 0) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select('id, title, slug, thumbnail, price')
    .in('id', ids)
  return data ?? []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct(params.slug)
  if (!p) return { title: 'Product not found' }

  const ogImageUrl = p.og_image
    ?? `${BASE}/api/og?title=${encodeURIComponent(p.title)}&subtitle=${encodeURIComponent(p.description?.slice(0, 120) ?? '')}&image=${encodeURIComponent(p.thumbnail ?? '')}`

  return {
    title: p.title,
    description: p.description?.slice(0, 160),
    alternates: {
      canonical: `${BASE}/shop/${p.slug}`,
      languages: { 'en-US': `${BASE}/shop/${p.slug}`, 'fr-FR': `${BASE}/fr/shop/${p.slug}` },
    },
    openGraph: {
      title: p.title,
      description: p.description?.slice(0, 160) ?? '',
      url: `${BASE}/shop/${p.slug}`,
      images: [
        { url: ogImageUrl, width: 1200, height: 630, alt: p.title },
        // Pinterest Rich Pin image
        {
          url: `${BASE}/api/og?title=${encodeURIComponent(p.title)}&image=${encodeURIComponent(p.thumbnail ?? '')}&variant=pin`,
          width: 1000, height: 1500, alt: p.title,
        },
      ],
      type: 'website',
    },
    other: {
      // Pinterest Rich Pin product meta
      'og:type': 'og:product',
      'product:price:amount': String(p.price),
      'product:price:currency': p.currency ?? 'USD',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const p = await getProduct(params.slug)
  if (!p) notFound()

  const cat = p.category as unknown as { name: string; name_fr?: string; slug: string } | null
  const faqs = ((p.product_faqs as Array<{ question: string; answer: string; sort_order: number }> | null) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)

  const bundleItems = p.is_bundle
    ? await getBundleItems((p.bundle_items as string[] | null) ?? [])
    : []
  const bundleSavings = p.compare_price && p.compare_price > p.price
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100)
    : 0

  const productUrl = `${BASE}/shop/${p.slug}`

  const howToSteps = [
    { name: 'Purchase & download', text: 'Add to cart, complete checkout — receive an instant download link.' },
    { name: 'Open the file', text: `Open the PDF in your preferred app (${(p.file_formats as string[] | null)?.join(', ') ?? 'PDF'}).` },
    { name: 'Print or use digitally', text: 'Print at home (A4 or US Letter) or use on your iPad via GoodNotes / Notability.' },
    { name: 'Plan your day', text: 'Fill in your priorities, tasks, and goals — one page at a time.' },
  ]

  return (
    <>
      {/* JSON-LD */}
      <ProductSchema
        name={p.title}
        description={p.description ?? ''}
        images={(p.images as string[] | null) ?? []}
        price={p.price}
        currency={p.currency ?? 'USD'}
        url={productUrl}
        sku={p.id}
        ratingValue={p.rating_avg ?? undefined}
        reviewCount={p.rating_count ?? undefined}
      />
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Shop', url: `${BASE}/shop` },
        ...(cat ? [{ name: cat.name, url: `${BASE}/shop/category/${cat.slug}` }] : []),
        { name: p.title, url: productUrl },
      ]} />
      {faqs.length > 0 && (
        <FaqSchema items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
      )}
      <HowToSchema
        name={`How to use ${p.title}`}
        description={`Step-by-step guide to download and use the ${p.title}.`}
        steps={howToSteps}
      />
      {bundleItems.length > 0 && (
        <ItemListSchema
          name={`What's included in ${p.title}`}
          url={productUrl}
          items={bundleItems.map((item, i) => ({ name: item.title, url: `${BASE}/shop/${item.slug}`, position: i + 1 }))}
        />
      )}

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-xs text-[var(--text-muted)] mb-6 flex items-center gap-1.5">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">Shop</Link>
          {cat && (<><span>/</span><Link href={`/shop/category/${cat.slug}`}>{cat.name}</Link></>)}
          <span>/</span>
          <span className="text-[var(--text-primary)]">{p.title}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {p.thumbnail && (
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--bg-subtle)]">
                <Image src={p.thumbnail} alt={p.title} fill className="object-cover" priority />
              </div>
            )}
            {(p.images as string[] | null)?.slice(0, 4).map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-subtle)]">
                <Image src={img} alt={`${p.title} preview ${i + 2}`} fill className="object-cover" />
              </div>
            ))}
          </div>

          {/* Info */}
          <div>
            {cat && (
              <Link href={`/shop/category/${cat.slug}`}
                className="text-xs font-semibold text-[#C9A84C] uppercase tracking-widest mb-2 block">
                {cat.name}
              </Link>
            )}
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{p.title}</h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-2xl font-bold">${p.price.toFixed(2)}</span>
              {p.compare_price && (
                <span className="text-lg text-[var(--text-muted)] line-through">${p.compare_price.toFixed(2)}</span>
              )}
              {bundleSavings > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#C9A84C' }}>
                  Save {bundleSavings}%
                </span>
              )}
            </div>

            {/* Bundle contents */}
            {bundleItems.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] p-4 mb-6">
                <p className="text-sm font-semibold mb-3">What's included ({bundleItems.length} planners)</p>
                <ul className="space-y-3">
                  {bundleItems.map((item) => (
                    <li key={item.id}>
                      <Link href={`/shop/${item.slug}`} className="flex items-center gap-3 group">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-subtle)] flex-shrink-0">
                          {item.thumbnail && (
                            <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                          )}
                        </div>
                        <span className="text-sm flex-1 group-hover:text-[#C9A84C] transition-colors">{item.title}</span>
                        <span className="text-xs text-[var(--text-muted)]">${item.price.toFixed(2)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rating */}
            {(p.rating_count ?? 0) > 0 && (
              <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="text-yellow-500">{'★'.repeat(Math.round(p.rating_avg ?? 0))}</span>
                <span className="text-[var(--text-muted)]">({p.rating_count} reviews)</span>
              </div>
            )}

            {p.description && (
              <p className="text-[var(--text-muted)] leading-relaxed mb-6">{p.description}</p>
            )}

            {/* Specs */}
            <div className="rounded-xl border border-[var(--border)] p-4 mb-6 text-sm space-y-2">
              {(p.file_formats as string[] | null)?.length && (
                <div className="flex gap-2">
                  <span className="font-medium w-28 shrink-0">Formats</span>
                  <span className="text-[var(--text-muted)]">{(p.file_formats as string[]).join(', ')}</span>
                </div>
              )}
              {p.page_count && (
                <div className="flex gap-2">
                  <span className="font-medium w-28 shrink-0">Pages</span>
                  <span className="text-[var(--text-muted)]">{p.page_count}</span>
                </div>
              )}
              {p.file_size_mb && (
                <div className="flex gap-2">
                  <span className="font-medium w-28 shrink-0">File size</span>
                  <span className="text-[var(--text-muted)]">{p.file_size_mb} MB</span>
                </div>
              )}
            </div>

            {/* Add to cart placeholder — integrates with existing checkout */}
            <Link href={`/checkout?product=${p.id}`}
              className="w-full block text-center rounded-xl bg-[#C9A84C] py-3.5 font-semibold text-white hover:bg-[#b8963e] transition-colors mb-3">
              Buy now — ${p.price.toFixed(2)}
            </Link>

            {/* Last updated (freshness signal) */}
            <p className="text-xs text-[var(--text-muted)] text-center mt-3">
              Last updated: {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Direct-answer / GEO content block */}
        <section className="mt-16 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold mb-4">What's included</h2>
            <ul className="space-y-2 text-[var(--text-muted)] text-sm">
              <li>✓ Instant PDF download after purchase</li>
              {(p.file_formats as string[] | null)?.includes('GoodNotes') && <li>✓ GoodNotes-ready hyperlinked template</li>}
              {(p.file_formats as string[] | null)?.includes('Notability') && <li>✓ Notability-ready template</li>}
              <li>✓ A4, US Letter, and A5 sizes included</li>
              {p.page_count && <li>✓ {p.page_count} pages</li>}
              <li>✓ Personal use licence included</li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Who it's for</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              This planner is designed for anyone who wants to stay organized without spending hours setting up a system.
              Works for students, professionals, and busy parents alike — print it once, use it every day.
            </p>
          </div>
        </section>

        {/* How to use */}
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">How to use this planner</h2>
          <ol className="space-y-4">
            {howToSteps.map((step, i) => (
              <li key={i} className="flex gap-4 text-sm">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#C9A84C] text-white flex items-center justify-center font-bold text-xs">{i + 1}</span>
                <div>
                  <span className="font-semibold">{step.name}</span>
                  <span className="text-[var(--text-muted)]"> — {step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="rounded-xl border border-[var(--border)] p-4 group">
                  <summary className="font-medium cursor-pointer list-none flex justify-between items-center">
                    {faq.question}
                    <span className="text-[var(--text-muted)] ml-2 group-open:rotate-180 transition-transform">↓</span>
                  </summary>
                  <p className="mt-3 text-[var(--text-muted)] text-sm leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Lead magnet CTA */}
        <section className="mt-16">
          <OptInForm
            locale="en"
            variant="inline"
            magnetTitle="Not ready to buy? Get a free sample planner →"
            className="max-w-xl"
          />
        </section>
      </main>
    </>
  )
}
