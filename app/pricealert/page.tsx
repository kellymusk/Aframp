import { SmoothScroll } from '@/components/smooth-scroll'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { LogoMarquee } from '@/components/logo-marquee'
import { BlockchainNetworks } from '@/components/blockchain-networks'
import { BentoGrid } from '@/components/bento-grid'
import { HowItWorks } from '@/components/how-it-works'
import { FinalCTA } from '@/components/final-cta'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-background text-foreground">
        <Navbar />
        <Hero />
        <LogoMarquee />
        <BlockchainNetworks />
        <BentoGrid />
        <HowItWorks />
        <FinalCTA />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
