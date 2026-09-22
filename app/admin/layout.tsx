'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { useSession } from '@/components/session-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { api, ApiError, type Me } from '@/lib/api'

type GateState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'done' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [gate, setGate] = useState<GateState>({ status: 'loading' })

  useEffect(() => {
    if (ready && !session) router.replace('/login')
  }, [ready, session, router])

  useEffect(() => {
    if (!session) return
    let cancelled = false
    setGate({ status: 'loading' })

    api
      .getMe(session.token)
      .then((data) => {
        if (cancelled) return
        setMe(data)
        setGate({ status: 'done' })
      })
      .catch((cause) => {
        if (cancelled) return
        const message =
          cause instanceof ApiError && cause.status === 0
            ? "Can't reach the payment server right now."
            : cause instanceof Error
              ? cause.message
              : 'Could not verify admin access.'
        setGate({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [session])

  if (!ready || !session || gate.status === 'loading') {
    return (
      <main className="dark bg-ink flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </main>
    )
  }

  if (gate.status === 'error') {
    return (
      <main className="dark bg-ink flex min-h-dvh items-center justify-center p-6">
        <ErrorState message={gate.message} onRetry={() => setGate({ status: 'loading' })} />
      </main>
    )
  }

  if (!me?.is_admin) {
    return (
      <main className="dark bg-ink font-brand flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center text-white">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-dim max-w-sm text-sm">
          This account doesn&apos;t have admin privileges. If you believe this is a mistake,
          contact whoever manages the platform.
        </p>
        <Link
          href="/home"
          className="from-cta-from to-cta-to mt-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          Back to your dashboard
        </Link>
      </main>
    )
  }

  return (
    <div className="dark bg-ink font-brand flex min-h-dvh text-white">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  )
}
