'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWishlistStore } from '@/lib/store'
import ProductCard from '@/components/shop/ProductCard'
import type { Product } from '@/types/database'

// The wishlist lives in the browser (localStorage via Zustand), so this page is
// client-side: it reads the saved product ids and hydrates them from Supabase.
export default function WishlistClient() {
  const ids = useWishlistStore((s) => s.ids)
  const [mounted, setMounted]   = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    let alive = true
    if (ids.length === 0) { setProducts([]); setLoading(false); return }
    setLoading(true)
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(name, slug)')
        .in('id', ids)
        .eq('status', 'active')
      if (!alive) return
      // Keep the order the items were saved in; drop any that are gone/inactive.
      const byId = new Map((data ?? []).map((p: any) => [p.id, p]))
      setProducts(ids.map((id) => byId.get(id)).filter(Boolean) as Product[])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [ids, mounted])

  return (
    <div className="container-site py-10 lg:py-14 min-h-[60vh]">
      <div className="mb-8">
        <h1 className="font-display font-semibold" style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: 'var(--text-primary)' }}>
          Your wishlist
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {mounted && !loading && products.length > 0
            ? `${products.length} saved ${products.length === 1 ? 'item' : 'items'}.`
            : 'Planners and notebooks you’ve saved for later.'}
        </p>
      </div>

      {(!mounted || loading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl skeleton" style={{ aspectRatio: '3/4' }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(var(--gold-rgb),0.12)' }}>
            <Heart size={22} style={{ color: 'var(--gold)' }} />
          </div>
          <h2 className="font-display text-xl mb-2" style={{ color: 'var(--text-primary)' }}>Nothing saved yet</h2>
          <p className="max-w-sm text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Tap the heart on any planner or notebook to save it here for later.
          </p>
          <Link href="/shop" className="btn-primary px-6 py-3">
            Browse the shop <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
