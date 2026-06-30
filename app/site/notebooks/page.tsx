import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { ItemListSchema } from '@/components/seo/JsonLd'
import { OptInForm } from '@/components/funnel/OptInForm'

export const revalidate = 600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://arwignplanners.com'

export const metadata: Metadata = {
  title: 'Digital Notebooks — Arwign Planners',
  description: 'Beautifully designed digital and printable notebooks for productivity, journaling, and creative work. Download instantly.',
  alternates: { canonical: `${BASE_URL}/notebooks` },
  openGraph: {
    title: 'Digital Notebooks — Arwign Planners',
    description: 'Beautifully designed digital and printable notebooks. Download instantly.',
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

  const items = (notebooks ?? [])

  return (
    <>
      <ItemListSchema
        name="Digital Notebooks"
        url={`${BASE_URL}/notebooks`}
        items={items.map((p, i) => ({
          position: i + 1,
          name: p.title,
          url: `${BASE_URL}/shop/${p.slug}`,
        }))}
      />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-3">Digital Notebooks</span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Capture the chaos. Find the clarity.</h1>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto text-lg">
            Structured layouts for bullet journaling, project planning, and creative writing — downloadable instantly, printable or use digitally on any device.
          </p>
        </div>

        {/* GEO direct-answer block */}
        <section className="mb-10 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-3">What's included in each notebook?</h2>
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li><span className="font-medium text-[var(--text-primary)]">High-resolution PDF</span> — print at home or at any copy shop</li>
            <li><span className="font-medium text-[var(--text-primary)]">GoodNotes / Notability ready</span> — import directly into your favourite app</li>
            <li><span className="font-medium text-[var(--text-primary)]">Multiple size options</span> — A4, US Letter, A5</li>
            <li><span className="font-medium text-[var(--text-primary)]">Lifetime access</span> — download again any time from your order history</li>
          </ul>
        </section>

        {/* Product grid */}
        {items.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-20">Notebooks coming soon — sign up below to be first to know.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {items.map((p) => {
              const img = (p.images as string[] | null)?.[0]
              const price = p.price != null
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency ?? 'USD' }).format(p.price)
                : null
              return (
                <Link key={p.id} href={`/shop/${p.slug}`}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[3/4] bg-[var(--bg-muted)] relative overflow-hidden">
                    {img ? (
                      <Image src={img} alt={p.title} fill className="object-cover group-hover:scale-102 transition-transform duration-300" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm">No preview</div>
                    )}
                    {p.fulfillment_options === 'both' && (
                      <span className="absolute top-3 right-3 rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide shadow">
                        Also in print
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-base mb-1 line-clamp-2">{p.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">{price ?? 'Free'}</span>
                      <span className="text-sm text-[#C9A84C] font-medium group-hover:underline">View →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Lead magnet CTA */}
        <div className="mt-16 border-t border-[var(--border)] pt-12">
          <OptInForm variant="footer" locale="en" />
        </div>
      </main>
    </>
  )
}
