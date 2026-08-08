'use client'

import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { WalletsTab } from '@/components/settings/wallets-tab'
import { useWallet } from '@/hooks/useWallet'
import { walletSession } from '@/lib/wallet/session'

export function WalletsPageClient() {
  const { publicKey } = useWallet()
  const walletAddress = publicKey || walletSession.getAddress() || ''

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected custodial and external wallets, view balances, and control
            connections.
          </p>
        </div>

        {/* Wallet management UI */}
        <WalletsTab />
      </div>
    </DashboardLayout>
  )
}
