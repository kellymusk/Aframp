'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useWallet } from '@/hooks/useWallet'
import { walletSession } from '@/lib/wallet/session'
import { KycDashboardGuard } from '@/components/kyc/kyc-dashboard-guard'

interface DashboardPageClientProps {
  initialWallet?: string
  initialAddress?: string
}

export function DashboardPageClient({ initialWallet, initialAddress }: DashboardPageClientProps) {
  const router = useRouter()
  const { state, publicKey } = useWallet()
  
  const [isMounted, setIsMounted] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [walletName, setWalletName] = useState<string>('')

  // Resolve the active wallet details
  const activeAddress = publicKey || initialAddress || walletSession.getAddress()
  const activeName = (publicKey ? 'Freighter' : '') || initialWallet || walletSession.getName()
  const hasActiveConnection = Boolean(activeAddress && activeName)

  // Track auto-reconnection and connecting states
  const isConnecting = state === 'connecting'
  const isAutoReconnecting = publicKey !== null && state !== 'connected'
  const isLoading = !isMounted || isConnecting || isAutoReconnecting

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sync state and ensure session storage persistence once mounted
  useEffect(() => {
    if (!isMounted) return

    if (activeAddress && activeName) {
      setWalletAddress(activeAddress)
      setWalletName(activeName)

      // Ensure persistence within the session
      walletSession.setName(activeName)
      walletSession.setAddress(activeAddress)
    }
  }, [isMounted, activeAddress, activeName])

  // Handle redirection only after mounting and loading state settles
  useEffect(() => {
    if (!isMounted || isLoading) return

    if (!hasActiveConnection) {
      router.push('/')
    }
  }, [isMounted, isLoading, hasActiveConnection, router])

  if (isLoading || !hasActiveConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <KycDashboardGuard>
        <DashboardContent walletName={walletName} walletAddress={walletAddress} />
      </KycDashboardGuard>
    </DashboardLayout>
  )
}

