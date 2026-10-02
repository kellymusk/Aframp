'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { WalletSidebar } from '@/components/wallet/wallet-sidebar'
import { useSession } from '@/components/session-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DarkScopeContext } from '@/components/dark-scope'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  // Admin pages bring their own navigation.
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  const [scopeNode, setScopeNode] = useState<HTMLDivElement | null>(null)
  const redirectRef = useRef(false)

  useEffect(() => {
    if (!ready || session || redirectRef.current) return
    redirectRef.current = true
    router.replace('/login')
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
    <div
      ref={setScopeNode}
      className="dark bg-ink font-brand flex min-h-dvh flex-col text-white lg:flex-row"
    >
      {!isAdmin && <WalletSidebar />}
      <main className={isAdmin ? 'min-w-0 flex-1' : 'min-w-0 flex-1 p-4 sm:p-6 lg:p-8'}>
        <DarkScopeContext.Provider value={scopeNode}>{children}</DarkScopeContext.Provider>
      </main>
    </div>
  )
}
