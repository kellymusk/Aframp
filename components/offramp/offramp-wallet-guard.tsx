'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'
import { Button } from '@/components/ui/button'

interface OfframpWalletGuardProps {
  children: React.ReactNode
}

export function OfframpWalletGuard({ children }: OfframpWalletGuardProps) {
  const router = useRouter()
  const { isConnected, isConnecting } = useWallet()

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Checking wallet connection...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Wallet required</h1>
          <p className="text-sm text-muted-foreground">
            Please connect your Stellar wallet from the dashboard before starting an offramp
            withdrawal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/')}>Back to home</Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="border-border"
            >
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
