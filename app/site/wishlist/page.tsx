import type { Metadata } from 'next'
import WishlistClient from './WishlistClient'

export const metadata: Metadata = {
  title: 'Your Wishlist — Arwign Planners',
  description: 'The planners and notebooks you’ve saved to your wishlist.',
  robots: { index: false, follow: false },
}

export default function WishlistPage() {
  return <WishlistClient />
}
