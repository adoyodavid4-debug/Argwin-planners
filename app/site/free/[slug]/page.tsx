import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { OptInForm } from '@/components/funnel/OptInForm'
import Image from 'next/image'

interface Props {
  params: { slug: string }
  searchParams: { locale?: string }
}

type Locale = 'en' | 'fr'

async function getMagnet(slug: string) {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('lead_magnets')
    .select('id, slug, title_i18n, description_i18n, preview_image, og_image')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const magnet = await getMagnet(params.slug)
  if (!magnet) return { title: 'Free Resource' }

  const locale = (searchParams.locale === 'fr' ? 'fr' : 'en') as Locale
  const title = (magnet.title_i18n as Record<string, string>)[locale] ?? ''
  const desc  = (magnet.description_i18n as Record<string, string>)[locale] ?? ''

  return {
    title: `${title} — Free Download | Arwign Planners`,
    description: desc,
    alternates: { canonical: `https://www.arwignplanners.com/free/${params.slug}` },
    openGraph: {
      title,
      description: desc,
      images: magnet.og_image ? [{ url: magnet.og_image, width: 1200, height: 630 }] : [],
    },
  }
}

export default async function FreeMagnetPage({ params, searchParams }: Props) {
  const magnet = await getMagnet(params.slug)
  if (!magnet) notFound()

  const locale = (searchParams.locale === 'fr' ? 'fr' : 'en') as Locale
  const title = (magnet.title_i18n as Record<string, string>)[locale] ?? ''
  const description = (magnet.description_i18n as Record<string, string>)[locale] ?? ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `https://www.arwignplanners.com/free/${params.slug}`,
    isPartOf: { '@type': 'WebSite', name: 'Arwign Planners', url: 'https://www.arwignplanners.com' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="min-h-screen bg-[var(--bg-primary,#FAF8F4)] flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full mx-auto text-center mb-8">
          {magnet.preview_image && (
            <div className="relative w-48 h-48 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg">
              <Image src={magnet.preview_image} alt={title} fill className="object-cover" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">{title}</h1>
          {description && (
            <p className="text-[var(--text-muted)] text-base leading-relaxed">{description}</p>
          )}
        </div>

        <OptInForm
          locale={locale}
          variant="inline"
          leadMagnetId={magnet.id}
          magnetTitle={locale === 'fr' ? 'Télécharger gratuitement →' : 'Get my free download →'}
          className="max-w-md w-full"
        />
      </main>
    </>
  )
}
