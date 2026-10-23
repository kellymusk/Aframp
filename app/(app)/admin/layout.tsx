'use client'

import Link from 'next/link'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { useSession } from '@/components/session-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { ApiError } from '@/lib/api'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { me, meLoading, meError, refreshMe } = useSession()

  // No profile and no failure yet means the session is still starting up.
  if (meLoading || (!me && !meError)) {
    return (
      <div className="dark bg-ink flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!me && meError) {
    const message =
      meError instanceof ApiError && meError.status === 0
        ? "Can't reach the payment server right now."
        : meError instanceof Error
          ? meError.message
          : 'Could not verify admin access.'
    return (
      <div className="dark bg-ink flex min-h-dvh items-center justify-center p-6">
        <ErrorState message={message} onRetry={() => void refreshMe().catch(() => {})} />
      </div>
    )
  }

  if (!me?.is_admin) {
    return (
      <div className="dark bg-ink font-brand flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center text-white">
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="text-dim max-w-sm text-sm">
          This account doesn&apos;t have admin privileges. If you believe this is a mistake, contact
          whoever manages the platform.
        </p>
        <Link
          href="/home"
          className="from-cta-from to-cta-to mt-2 rounded-full bg-gradient-to-r px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          Back to your dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="dark bg-ink font-brand flex min-h-dvh flex-col text-white lg:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  )
}
