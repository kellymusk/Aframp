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
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (!ready || session || redirectRef.current) return
    redirectRef.current = true
    router.replace('/login')
  }, [ready, session, router])

  // Global connectivity banner: initialize from navigator.onLine and track events.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOffline(true)
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black"
        >
          You&apos;re offline. Some features may be unavailable until your connection returns.
        </div>
      )}
      {!isAdmin && <WalletSidebar />}
      <main className={isAdmin ? 'min-w-0 flex-1' : 'min-w-0 flex-1 p-4 sm:p-6 lg:p-8'}>
        <DarkScopeContext.Provider value={scopeNode}>{children}</DarkScopeContext.Provider>
      </main>
    </div>
  )
}
