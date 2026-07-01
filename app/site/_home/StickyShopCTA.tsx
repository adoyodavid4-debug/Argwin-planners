'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export default function StickyShopCTA() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    // Show after the hero, hide once near the footer/final CTA
    const onScroll = () => {
      const y = window.scrollY
      const nearBottom = window.innerHeight + y > document.body.scrollHeight - 900
      setShow(y > 700 && !nearBottom)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 z-40 flex justify-center sm:block">
          <Link href="/shop" className="btn-primary shadow-gold-lg !py-3.5 !px-7 w-full sm:w-auto justify-center">
            <ShoppingBag size={16} /> Shop now <ArrowRight size={15} />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
