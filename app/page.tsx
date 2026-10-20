import { Faq } from '@/components/landing-light/faq'
import { FinalCta } from '@/components/landing-light/final-cta'
import { Hero } from '@/components/landing-light/hero'
import { HowItWorks } from '@/components/landing-light/how-it-works'
import { SiteFooter } from '@/components/landing-light/site-footer'
import { UseCases } from '@/components/landing-light/use-cases'
import { WhyUs } from '@/components/landing-light/why-us'

export const metadata = {
  title: "Aframp — Africa's gateway to global decentralized finance",
  description:
    'Fast, secure, and effortless for everyday spending. Send money to anyone in Africa instantly.',
}

export default function Home() {
  return (
    <div className="font-brand bg-white dark:bg-surface">
      <main>
        <Hero />
        <UseCases />
        <HowItWorks />
        <Faq />
        <WhyUs />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}
