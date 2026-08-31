'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { WalletSidebar } from '@/components/wallet/wallet-sidebar'
import { useSession } from '@/components/session-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DarkScopeContext } from '@/components/dark-scope'
import { usePaymentPoller } from '@/hooks/use-payment-poller'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession()
  const router = useRouter()
  const [scopeNode, setScopeNode] = useState<HTMLDivElement null |>(null)

  // Enable automatic 30s polling for confirmed payment notifications
  usePaymentPoller()

  useEffect(() => {
    if (ready && !session) router.replace('/login')
  }, [ready, session, router])

  // Children below assume a session exists; don't mount them until it does.
  if (!ready || !session) {
    return (
      <main className="dark bg-ink flex min-h-dvh items-center justify-center">
        <LoadingSpinner/>
      </main>
    )
  }

  return (
    <div ref={setScopeNode} className="dark bg-ink font-brand flex min-h-dvh text-white">
      <Toaster position="top-right" richColors theme="dark"/>
      <WalletSidebar/>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <DarkScopeContext.Provider value="{scopeNode}">{children}</DarkScopeContext.Provider>
      </main>
    </div>
  )
}