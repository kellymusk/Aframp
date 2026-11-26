'use client'

import Link from 'next/link'
import { useSession } from '@/components/session-provider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

/**
 * Identity verification status (#885). Cash out links here when KYC isn't
 * approved. Submission depends on the backend (kellymusk/aframp-backend#1281);
 * until that ships this page shows the current status from /me.
 */
export default function KycPage() {
  const { me, meLoading, meError } = useSession()

  if (meLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  const status = me?.kyc_status ?? null
  const message = meError
    ? 'We could not load your verification status. Please try again in a moment.'
    : status === 'approved'
      ? 'Your identity is verified. You can cash out.'
      : status === 'pending'
        ? 'Your documents are being reviewed. We will let you know once this is done — usually within 1–2 business days.'
        : status === 'rejected'
          ? 'We could not verify your identity. Please contact support to resubmit your documents.'
          : 'You have not verified your identity yet. Online verification is coming soon — contact support to get verified in the meantime.'

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Identity verification</h1>
        <p className="text-dim mt-1 text-sm">Required before you can cash out.</p>
      </header>

      <div className="mt-6 max-w-xl space-y-5">
        <p className="text-sm">
          Status: <span className="font-semibold capitalize">{status ?? 'not started'}</span>
        </p>
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button asChild variant={status === 'approved' ? 'default' : 'outline'}>
          <Link href={status === 'approved' ? '/withdraw' : '/home'}>
            {status === 'approved' ? 'Go to Cash out' : 'Back to home'}
          </Link>
        </Button>
      </div>
    </div>
  )
}
