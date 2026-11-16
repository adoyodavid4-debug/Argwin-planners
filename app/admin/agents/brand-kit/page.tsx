import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'
import BrandKitClient from './BrandKitClient'

export const metadata: Metadata = {
  title: 'Brand Kit — Agent Command Centre',
  robots: { index: false, follow: false },
}

export default async function BrandKitPage() {
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from('ag_brand_kit').select('*').single()
  return <BrandKitClient brandKit={data} />
}
