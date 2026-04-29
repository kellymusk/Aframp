'use client'

import { useRouter } from 'next/navigation'
import { FeatureHighlightsCarousel } from '@/components/onboarding/feature-highlights-carousel'

export default function FeatureHighlightsPage() {
  const router = useRouter()

  return (
    <FeatureHighlightsCarousel
      onBack={() => router.push('/welcome')}
      onComplete={() => router.push('/wallet-setup')}
      onSkip={() => router.push('/wallet-setup')}
    />
  )
}
