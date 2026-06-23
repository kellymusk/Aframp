import { SmoothScroll } from '@/components/smooth-scroll'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import PriceAlertPage from '@/components/pricealert/price-alert-page'

export default function PriceAlertRoute() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <PriceAlertPage />
        </div>
        <Footer />
      </main>
    </SmoothScroll>
  )
}
