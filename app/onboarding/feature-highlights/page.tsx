// Aframp/app/onboarding/feature-highlights/page.tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function FeatureHighlightsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Feature Highlights</h1>
        <p className="text-muted-foreground">This is a placeholder for the feature highlights screen.</p>
        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/onboarding/welcome">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Welcome
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}