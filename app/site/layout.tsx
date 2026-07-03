import Navbar, { type NavItem } from '@/components/layout/Navbar'
import Footer, { type FooterLink } from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface NavRow {
  id: string
  label: string
  href: string
  location: string
  parent_id: string | null
  sort_order: number
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}

async function getLayoutData() {
  // Fetched with the anon client + RLS. Any failure falls back to the
  // components' hardcoded content — the storefront must never break.
  try {
    const supabase = createServerSupabaseClient()
    const [{ data: navRows }, { data: settingRows }] = await Promise.all([
      supabase
        .from('nav_links')
        .select('id, label, href, location, parent_id, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'announcement_text', 'store_name', 'footer_blurb',
          'social_instagram', 'social_youtube', 'social_pinterest', 'social_tiktok',
        ]),
    ])

    const rows = (navRows ?? []) as NavRow[]
    const settings: Record<string, unknown> = {}
    for (const row of settingRows ?? []) settings[row.key] = row.value

    // Build the header tree (top-level items with optional dropdown children)
    const headerRows = rows.filter((r) => r.location === 'header')
    const headerLinks: NavItem[] = headerRows
      .filter((r) => !r.parent_id)
      .map((parent) => {
        const children = headerRows
          .filter((c) => c.parent_id === parent.id)
          .map((c) => ({ label: c.label, href: c.href }))
        return children.length > 0
          ? { label: parent.label, href: parent.href, children }
          : { label: parent.label, href: parent.href }
      })

    const footerColumn = (location: string): FooterLink[] =>
      rows
        .filter((r) => r.location === location && !r.parent_id)
        .map((r) => ({ label: r.label, href: r.href }))

    return {
      headerLinks,
      footerShop:    footerColumn('footer_shop'),
      footerCompany: footerColumn('footer_company'),
      footerSupport: footerColumn('footer_support'),
      announcement:  str(settings.announcement_text),
      storeName:     str(settings.store_name),
      footerBlurb:   str(settings.footer_blurb),
      socialUrls: {
        instagram: str(settings.social_instagram),
        youtube:   str(settings.social_youtube),
        pinterest: str(settings.social_pinterest),
        tiktok:    str(settings.social_tiktok),
      },
    }
  } catch (err) {
    console.error('[site layout] failed to load nav/settings, using fallbacks:', err)
    return {
      headerLinks:   undefined,
      footerShop:    undefined,
      footerCompany: undefined,
      footerSupport: undefined,
      announcement:  undefined,
      storeName:     undefined,
      footerBlurb:   undefined,
      socialUrls:    undefined,
    }
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const data = await getLayoutData()

  return (
    <>
      <Navbar links={data.headerLinks} announcement={data.announcement} />
      <CartDrawer />
      <main className="w-full min-h-screen">{children}</main>
      <Footer
        shopLinks={data.footerShop}
        companyLinks={data.footerCompany}
        supportLinks={data.footerSupport}
        socialUrls={data.socialUrls}
        blurb={data.footerBlurb}
        storeName={data.storeName}
      />
    </>
  )
}
