import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ItemListSchema, FaqSchema } from '@/components/seo/JsonLd'
import GeneralClient, { type NbProduct, type RelItem } from './GeneralClient'
import { FAQS } from './data'

export const revalidate = 600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'General Notebooks — Ready-Made, Instant Download | Arwign Planners',
  description: 'Versatile ready-made digital notebooks for journaling, planning and notes. Choose your colourway and size, download instantly. GoodNotes & Notability ready.',
  alternates: { canonical: `${BASE_URL}/notebooks` },
  openGraph: {
    title: 'General Notebooks — Arwign Planners',
    description: 'Ready-made digital notebooks — choose your colourway and size, download instantly.',
    url: `${BASE_URL}/notebooks/general`,
    type: 'website',
  },
}

export default async function GeneralNotebooksPage() {
  const supabase = createServiceRoleClient()

  const { data: notebooks } = await supabase
    .from('products')
    .select('id, title, slug, description, price, currency, images, status, product_type')
    .eq('product_type', 'notebook')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .then((r) => ({ data: r.error ? [] : r.data }))

  const items = (notebooks ?? []) as any[]
  const first = items[0]
  const product: NbProduct | null = first && first.price != null
    ? { id: first.id, title: first.title, slug: first.slug, price: first.price, currency: first.currency, thumbnail: (first.images as string[] | null)?.[0] ?? null }
    : null

  const related: RelItem[] = items
    .filter((p) => !product || p.id !== product.id)
    .map((p) => ({ id: p.id, title: p.title, slug: p.slug, price: p.price, currency: p.currency, image: (p.images as string[] | null)?.[0] ?? null }))

  return (
    <>
      <ItemListSchema name="General Notebooks" url={`${BASE_URL}/notebooks/general`}
        items={items.map((p, i) => ({ position: i + 1, name: p.title, url: `${BASE_URL}/shop/${p.slug}` }))} />
      <FaqSchema items={FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <GeneralClient product={product} related={related} />
    </>
  )
}
