import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ItemListSchema, FaqSchema } from '@/components/seo/JsonLd'
import NotebooksClient, { NOTEBOOK_FAQS } from './NotebooksClient'

export const revalidate = 600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'Digital Notebooks — Hyperlinked, GoodNotes Ready | Arwign Planners',
  description:
    'Beautifully designed digital and printable notebooks for journaling, project planning, study notes and creative work. Hyperlinked, GoodNotes & Notability ready, instant download.',
  alternates: { canonical: `${BASE_URL}/notebooks` },
  openGraph: {
    title: 'Digital Notebooks — Arwign Planners',
    description: 'Beautifully designed digital & printable notebooks. Instant download, GoodNotes ready.',
    url: `${BASE_URL}/notebooks`,
    type: 'website',
  },
}

export default async function NotebooksPage() {
  const supabase = createServiceRoleClient()

  const { data: notebooks } = await supabase
    .from('products')
    .select('id, title, slug, description, price, currency, images, status, product_type, fulfillment_options, categories(name, slug)')
    .eq('product_type', 'notebook')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .then((r) => ({ data: r.error ? [] : r.data }))

  const items = (notebooks ?? []) as any[]

  return (
    <>
      <ItemListSchema
        name="Digital Notebooks"
        url={`${BASE_URL}/notebooks`}
        items={items.map((p, i) => ({ position: i + 1, name: p.title, url: `${BASE_URL}/shop/${p.slug}` }))}
      />
      <FaqSchema items={NOTEBOOK_FAQS.map((f) => ({ question: f.q, answer: f.a }))} />
      <NotebooksClient notebooks={items} />
    </>
  )
}
