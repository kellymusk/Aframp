import { Suspense } from 'react'
import type { Metadata } from 'next'
import { BusinessPageClient } from '@/components/business/business-page-client'

export const metadata: Metadata = {
  title: 'Business - Aframp',
  description: 'Manage your team invites and API keys.',
}

export default async function BusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading business settings...</p>
          </div>
        </div>
      }
    >
      <BusinessPageClient />
    </Suspense>
  )
}
