import { Faq } from '@/components/landing-light/faq'
import { Features } from '@/components/landing-light/features'
import { FinalCta } from '@/components/landing-light/final-cta'
import { Hero } from '@/components/landing-light/hero'
import { HowItWorks } from '@/components/landing-light/how-it-works'
import { Pricing } from '@/components/landing-light/pricing'
import { SiteFooter } from '@/components/landing-light/site-footer'
import { Trust } from '@/components/landing-light/trust'
import { UseCases } from '@/components/landing-light/use-cases'
import { WhyUs } from '@/components/landing-light/why-us'

export const metadata = {
  title: "Aframp — Africa's gateway to global decentralized finance",
  description:
    'Fast, secure, and effortless for everyday spending. Send money to anyone in Africa instantly.',
}

// Single, theme-aware landing page (light and dark both live here via
// `dark:` classes) — the previous dark-only variant under
// `components/landing/` was unused and has been removed.
export default function Home() {
  return (
    <div className="font-brand bg-white dark:bg-surface">
      <Hero />
      <main>
        <HowItWorks />
        <Features />
        <UseCases />
        <Pricing />
        <Trust />
        <Faq />
        <WhyUs />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
