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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Skip to main content
      </a>
      <WalletSidebar />
      <main id="main-content" className="min-w-0 flex-1 px-6 pt-6 pb-24 md:p-6 lg:p-8">
        <DarkScopeContext.Provider value={scopeNode}>{children}</DarkScopeContext.Provider>
      </main>
      <MobileBottomNav />
    </div>
  )
}
