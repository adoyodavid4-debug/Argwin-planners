import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  ProductSchema,
  BreadcrumbSchema,
  FaqSchema,
  HowToSchema,
  ItemListSchema,
} from '@/components/seo/JsonLd'
import ProductDetailClient from './ProductDetailClient'

const BASE = 'https://arwignplanners.com'

interface Props { params: { slug: string } }

async function getProduct(slug: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select(`
      id, title, slug, description, price, compare_price, currency,
      images, thumbnail, preview_pages, og_image,
      file_formats, planner_files, page_count, file_size_mb, delivery_type,
      is_bundle, bundle_items, is_new, is_bestseller, tags, category_id,
      rating_avg, rating_count, status, updated_at,
      category:categories(name, slug),
      product_faqs(question, answer, sort_order)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return data
}

async function getBundleItems(ids: string[]) {
  if (!ids.length) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('products').select('id, title, slug, thumbnail, price, currency').in('id', ids)
  return data ?? []
}

async function getRelated(categoryId: string | null, excludeId: string) {
  if (!categoryId) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('products')
    .select('id, title, slug, thumbnail, price, currency, rating_avg, rating_count, is_bestseller, is_new')
    .eq('status', 'active').eq('category_id', categoryId).neq('id', excludeId)
    .order('download_count', { ascending: false }).limit(6)
    .then((r) => ({ data: r.error ? [] : r.data }))
  return data ?? []
}

async function getReviews(productId: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, title, body, verified, created_at')
    .eq('product_id', productId).eq('status', 'approved')
    .order('created_at', { ascending: false }).limit(12)
    .then((r) => ({ data: r.error ? [] : r.data }))
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
    alternates: { canonical: `${BASE}/shop/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.description?.slice(0, 160) ?? '',
      url: `${BASE}/shop/${p.slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: p.title }],
      type: 'website',
    },
    other: {
      'og:type': 'og:product',
      'product:price:amount': String(p.price),
      'product:price:currency': p.currency ?? 'USD',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const p = await getProduct(params.slug)
  if (!p) notFound()

  const cat = p.category as unknown as { name: string; slug: string } | null
  const faqs = ((p.product_faqs as Array<{ question: string; answer: string; sort_order: number }> | null) ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)

  const [bundleItems, related, reviews] = await Promise.all([
    p.is_bundle ? getBundleItems((p.bundle_items as string[] | null) ?? []) : Promise.resolve([]),
    getRelated(p.category_id ?? null, p.id),
    getReviews(p.id),
  ])

  const productUrl = `${BASE}/shop/${p.slug}`
  const howToSteps = [
    { name: 'Purchase & download', text: 'Add to cart, complete checkout — receive an instant download link.' },
    { name: 'Open the file', text: `Open the PDF in your preferred app (${(p.file_formats as string[] | null)?.join(', ') ?? 'PDF'}).` },
    { name: 'Print or use digitally', text: 'Print at home (A4 or US Letter) or use on your iPad via GoodNotes / Notability.' },
    { name: 'Plan your day', text: 'Fill in your priorities, tasks, and goals — one page at a time.' },
  ]

  // normalised, serialisable product for the client template
  const product = {
    id: p.id, title: p.title, slug: p.slug, description: p.description ?? '',
    price: p.price, compare_price: p.compare_price, currency: p.currency ?? 'USD',
    images: (p.images as string[] | null) ?? [], thumbnail: p.thumbnail ?? null,
    preview_pages: (p.preview_pages as string[] | null) ?? [],
    file_formats: (p.file_formats as string[] | null) ?? [], planner_files: (p.planner_files as any) ?? {},
    page_count: p.page_count ?? null, file_size_mb: p.file_size_mb ?? null, delivery_type: p.delivery_type ?? null,
    rating_avg: p.rating_avg ?? 0, rating_count: p.rating_count ?? 0,
    is_new: p.is_new ?? false, is_bestseller: p.is_bestseller ?? false, tags: (p.tags as string[] | null) ?? [],
    is_bundle: p.is_bundle ?? false, updated_at: p.updated_at,
    category: cat ? { name: cat.name, slug: cat.slug } : null,
  }

  return (
    <>
      <ProductSchema name={p.title} description={p.description ?? ''} images={(p.images as string[] | null) ?? []}
        price={p.price} currency={p.currency ?? 'USD'} url={productUrl} sku={p.id}
        ratingValue={p.rating_avg ?? undefined} reviewCount={p.rating_count ?? undefined} />
      <BreadcrumbSchema items={[
        { name: 'Home', url: BASE },
        { name: 'Shop', url: `${BASE}/shop` },
        ...(cat ? [{ name: cat.name, url: `${BASE}/shop/category/${cat.slug}` }] : []),
        { name: p.title, url: productUrl },
      ]} />
      {faqs.length > 0 && <FaqSchema items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />}
      <HowToSchema name={`How to use ${p.title}`} description={`Step-by-step guide to download and use the ${p.title}.`} steps={howToSteps} />
      {bundleItems.length > 0 && (
        <ItemListSchema name={`What's included in ${p.title}`} url={productUrl}
          items={bundleItems.map((item, i) => ({ name: item.title, url: `${BASE}/shop/${item.slug}`, position: i + 1 }))} />
      )}

      <ProductDetailClient
        product={product as any}
        related={related as any}
        reviews={reviews as any}
        bundleItems={bundleItems as any}
        faqs={faqs}
        howToSteps={howToSteps}
      />
    </>
  )
}
