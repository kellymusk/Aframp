'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WalletSidebar } from '@/components/wallet/wallet-sidebar'
import { MobileBottomNav } from '@/components/wallet/mobile-bottom-nav'
import { useSession } from '@/components/session-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DarkScopeContext } from '@/components/dark-scope'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession()
  const router = useRouter()
  const [scopeNode, setScopeNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (ready && !session) router.replace('/login')
  }, [ready, session, router])

  // Children below assume a session exists; don't mount them until it does.
  if (!ready || !session) {
    return (
      <main className="dark bg-ink flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </main>
    )
  }

  return (
    <div ref={setScopeNode} className="dark bg-ink font-brand flex min-h-dvh text-white">
      <WalletSidebar />
      <main className="min-w-0 flex-1 px-6 pt-6 pb-24 md:p-6 lg:p-8">
        <DarkScopeContext.Provider value={scopeNode}>{children}</DarkScopeContext.Provider>
      </main>
      <MobileBottomNav />
    </div>
  )
}
