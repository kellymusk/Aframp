'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KycModal } from './kyc-modal'
import { useKyc } from '@/contexts/kyc-context'
import { cn } from '@/lib/utils'

interface KycDashboardGuardProps {
  children: React.ReactNode
  requiredTier?: 'basic' | 'intermediate' | 'full'
  fallback?: React.ReactNode
}

/**
 * Wraps dashboard content and enforces KYC verification.
 * Shows a modal if user is not verified.
 */
export function KycDashboardGuard({
  children,
  requiredTier = 'basic',
  fallback,
}: KycDashboardGuardProps) {
  const { kycStatus, isVerified, isLoading } = useKyc()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Show modal if not verified and not loading
    if (!isLoading && !isVerified) {
      setShowModal(true)
    }
  }, [isVerified, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (!isVerified) {
    return (
      <>
        {fallback || (
          <div className="space-y-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-900">KYC Verification Required</h3>
              <p className="mt-1 text-sm text-gray-600">
                Complete your identity verification to unlock all features.
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="mx-auto bg-blue-600 hover:bg-blue-700"
            >
              Start Verification
            </Button>
          </div>
        )}

        <KycModal
          open={showModal}
          onOpenChange={setShowModal}
          onComplete={() => {
            // Modal stays open to show completion status
            // User can close it manually
          }}
        />
      </>
    )
  }

  if (kycStatus === 'rejected' || kycStatus === 'expired') {
    return (
      <>
        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {kycStatus === 'rejected'
                  ? 'Verification Failed'
                  : 'Verification Expired'}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {kycStatus === 'rejected'
                  ? 'Your verification was not approved. Please resubmit.'
                  : 'Your verification has expired. Please submit again.'}
              </p>
              <Button
                onClick={() => setShowModal(true)}
                size="sm"
                className="mt-3 bg-red-600 hover:bg-red-700"
              >
                Resubmit
              </Button>
            </div>
          </div>
        </div>

        <KycModal
          open={showModal}
          onOpenChange={setShowModal}
        />
      </>
    )
  }

  return <>{children}</>
}

/**
 * Badge showing KYC status in header/navbar
 */
interface KycStatusBadgeProps {
  className?: string
}

export function KycStatusBadge({ className }: KycStatusBadgeProps) {
  const { kycStatus, isVerified, isLoading } = useKyc()

  if (isLoading) return null

  if (!isVerified) {
    return (
      <div className={cn('flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800', className)}>
        <Lock className="h-3 w-3" />
        Unverified
      </div>
    )
  }

  if (kycStatus === 'approved') {
    return (
      <div className={cn('flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800', className)}>
        ✓ Verified
      </div>
    )
  }

  return null
}
