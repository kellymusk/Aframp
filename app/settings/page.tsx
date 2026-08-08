import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SettingsPageClient } from '@/components/settings/settings-page-client'

export const metadata: Metadata = {
  title: 'Settings - Aframp',
  description: 'Manage your Aframp account settings, notifications, security, and connected wallets.',
}

interface SettingsPageProps {
  searchParams: Promise<{
    tab?: string
    wallet?: string
    address?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { tab, address } = await searchParams

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      }
    >
      <SettingsPageClient initialTab={tab} walletAddress={address} />
    </Suspense>
  )
}
