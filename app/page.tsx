import type { Metadata } from 'next'
import { Faq } from '@/components/landing-light/faq'
import { FinalCta } from '@/components/landing-light/final-cta'
import { Hero } from '@/components/landing-light/hero'
import { HowItWorks } from '@/components/landing-light/how-it-works'
import { SiteFooter } from '@/components/landing-light/site-footer'
import { UseCases } from '@/components/landing-light/use-cases'
import { WhyUs } from '@/components/landing-light/why-us'

const title = "Aframp — Africa's gateway to global decentralized finance"
const description =
  'Fast, secure, and effortless for everyday spending. Send money to anyone in Africa instantly.'

// Share images come from app/opengraph-image.tsx and app/twitter-image.tsx.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: 'Aframp', title, description },
  twitter: { card: 'summary_large_image', title, description },
}

// Single, theme-aware landing page (light and dark both live here via
// `dark:` classes), built from `components/landing-light/`. The old dark-only
// variant under `components/landing/` has been deleted.
export default function Home() {
  return (
    <div className="font-brand bg-white dark:bg-surface">
      <Hero />
      <main>
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
