import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ItemListSchema, FaqSchema } from '@/components/seo/JsonLd'
import NotebooksClient from './NotebooksClient'

export const revalidate = 600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const NOTEBOOK_FAQS = [
  { q: 'How do I receive my notebook after purchase?', a: 'Instantly. A secure download link is emailed to you the moment payment clears, and it stays in your account so you can re-download any time.' },
  { q: 'Which apps and devices work with the notebooks?', a: 'Every notebook is hyperlinked and works in GoodNotes 5 & 6, Notability, Xodo and any PDF app on iPad, Android tablets and desktop. You can also print them at home.' },
  { q: 'What sizes are included?', a: 'Each notebook ships with A4, US Letter and A5 sizes so it fits your device or printer perfectly — no resizing required.' },
  { q: 'Can I get a notebook designed just for me?', a: 'Yes! Our personalized notebook service lets you describe the layout, theme or niche you need and our design team builds it around you.' },
  { q: 'Do the notebooks expire or need a subscription?', a: 'Never. Buy once and it is yours forever, with free access to any future updates of that notebook — no subscriptions, ever.' },
]

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
      <NotebooksClient notebooks={items} faqs={NOTEBOOK_FAQS} />
    </>
  )
}
