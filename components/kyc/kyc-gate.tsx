'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthenticatedSession } from '@/components/session-provider'
import { useKycStatus } from '@/hooks/use-kyc-status'

interface KycGateProps {
  children: React.ReactNode
  /** Where to send the user back to once KYC is approved. */
  returnTo: string
}

/**
 * Wraps a purchase flow (onramp or offramp) and blocks it behind identity
 * verification. First-time users are routed to /kyc; anyone already
 * `approved` passes straight through without another round-trip.
 */
export function KycGate({ children, returnTo }: KycGateProps) {
  const { token } = useAuthenticatedSession()
  const { status, loading, error } = useKycStatus(token)
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (status === 'approved') return <>{children}</>

  const isPending = status === 'pending'

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <ShieldAlert className="text-warning size-10" aria-hidden />
      <h2 className="text-xl font-bold">
        {isPending ? 'Verification in review' : 'Verify your identity to continue'}
      </h2>
      <p className="text-dim text-sm">
        {isPending
          ? 'Your KYC submission is being reviewed. This usually takes a few minutes — check back shortly.'
          : status === 'rejected'
            ? 'Your last submission was rejected. Please resubmit your documents to continue.'
            : status === 'expired'
              ? 'Your verification has expired. Please verify again to continue.'
              : 'To keep transactions safe and compliant, we need to verify your identity before your first purchase.'}
      </p>
      {!isPending && (
        <Button onClick={() => router.push(`/kyc?returnTo=${encodeURIComponent(returnTo)}`)}>
          Start verification
        </Button>
      )}
    </div>
  )
}
