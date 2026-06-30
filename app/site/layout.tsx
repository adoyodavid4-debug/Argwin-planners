import Navbar     from '@/components/layout/Navbar'
import Footer     from '@/components/layout/Footer'
import CartDrawer from '@/components/layout/CartDrawer'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main className="w-full min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
