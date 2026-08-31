import dynamic from 'next/dynamic'

import { Features } from '@/components/landing-light/features'
import { FinalCta } from '@/components/landing-light/final-cta'
import { Hero } from '@/components/landing-light/hero'
import { HowItWorks } from '@/components/landing-light/how-it-works'
import { Pricing } from '@/components/landing-light/pricing'
import {
  FaqSkeleton,
  SiteFooterSkeleton,
  UseCasesSkeleton,
} from '@/components/landing-light/section-skeletons'
import { Trust } from '@/components/landing-light/trust'
import { WhyUs } from '@/components/landing-light/why-us'

// Below-the-fold sections: split out of the initial bundle and streamed in
// once ready, so they don't compete with the hero for the first paint. (#477)
const UseCases = dynamic(
  () => import('@/components/landing-light/use-cases').then((m) => m.UseCases),
  { loading: () => <UseCasesSkeleton /> }
)
const Faq = dynamic(() => import('@/components/landing-light/faq').then((m) => m.Faq), {
  loading: () => <FaqSkeleton />,
})
const SiteFooter = dynamic(
  () => import('@/components/landing-light/site-footer').then((m) => m.SiteFooter),
  { loading: () => <SiteFooterSkeleton /> }
)

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
