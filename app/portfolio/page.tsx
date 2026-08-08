'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PortfolioPageClient } from '@/components/dashboard/portfolio-page-client'

export default function PortfolioPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const address = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null

    if (address) {
      setWalletAddress(address)
      setConnected(true)
    } else {
      router.push('/')
    }
  }, [router])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <PortfolioPageClient />
    </DashboardLayout>
  )
}
