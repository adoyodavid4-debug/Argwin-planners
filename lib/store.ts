// lib/store.ts — global Zustand state
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  title: string
  price: number
  thumbnail: string
  slug: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
  hasItem: (id: string) => boolean
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (!get().hasItem(item.id)) {
          set((state) => ({ items: [...state.items, item] }))
        }
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price, 0),
      itemCount: () => get().items.length,
      hasItem: (id) => get().items.some((i) => i.id === id),
    }),
    { name: 'arwign-cart' }
  )
)

// ─── Wishlist Store ────────────────────────────────────────
interface WishlistStore {
  ids: string[]
  toggle: (id: string) => void
  has: (id: string) => boolean
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((i) => i !== id) : [...state.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    { name: 'arwign-wishlist' }
  )
)

// ─── UI Store (search overlay, cart drawer, mobile nav) ────
interface UIStore {
  cartOpen: boolean
  searchOpen: boolean
  mobileNavOpen: boolean
  setCartOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  cartOpen: false,
  searchOpen: false,
  mobileNavOpen: false,
  setCartOpen: (v) => set({ cartOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
}))
